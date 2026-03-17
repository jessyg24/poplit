import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_READ_TIME_MS = 15_000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client to get auth user
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { story_id, section_opened, read_duration_ms } = await req.json();

    if (!story_id || !section_opened || read_duration_ms == null) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: story_id, section_opened, read_duration_ms" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (read_duration_ms < MIN_READ_TIME_MS) {
      return new Response(
        JSON.stringify({ error: `Minimum read time is ${MIN_READ_TIME_MS}ms` }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Service-role client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate story is published
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, status, author_id")
      .eq("id", story_id)
      .single();

    if (storyError || !story) {
      return new Response(JSON.stringify({ error: "Story not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (story.status !== "published") {
      return new Response(JSON.stringify({ error: "Story is not published" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Check section not already read by this user
    const { data: existingPop } = await supabase
      .from("pops")
      .select("id")
      .eq("story_id", story_id)
      .eq("reader_id", user.id)
      .eq("section_opened", section_opened)
      .maybeSingle();

    if (existingPop) {
      return new Response(JSON.stringify({ error: "Section already read" }), {
        status: 409,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Get reader stats for multiplier
    const { data: readerStats } = await supabase
      .from("reader_stats")
      .select("multiplier")
      .eq("user_id", user.id)
      .maybeSingle();

    const readerMultiplier = readerStats?.multiplier ?? 1.0;

    // Section weights: section 1=1.0, 2=1.2, 3=1.4, 4=1.6, 5=2.0
    const sectionWeights: Record<number, number> = {
      1: 1.0,
      2: 1.2,
      3: 1.4,
      4: 1.6,
      5: 2.0,
    };

    const sectionWeight = sectionWeights[section_opened] ?? 1.0;
    const weighted_value = sectionWeight * readerMultiplier;

    // Insert pop
    const { data: pop, error: popError } = await supabase
      .from("pops")
      .insert({
        story_id,
        reader_id: user.id,
        section_opened,
        read_duration_ms,
        weighted_value,
      })
      .select()
      .single();

    if (popError) {
      return new Response(JSON.stringify({ error: "Failed to insert pop", details: popError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Update scores table
    const { data: currentScore } = await supabase
      .from("scores")
      .select("*")
      .eq("story_id", story_id)
      .maybeSingle();

    const sectionReadCol = `section_${section_opened}_reads` as const;

    if (currentScore) {
      const newRawScore = (currentScore.raw_score ?? 0) + weighted_value;
      const newSectionReads = (currentScore[sectionReadCol] ?? 0) + 1;

      // Recalculate completion rate: count sections with at least 1 read
      const sectionCounts = [1, 2, 3, 4, 5].map((s) => {
        if (s === section_opened) return newSectionReads;
        return currentScore[`section_${s}_reads`] ?? 0;
      });
      const sectionsWithReads = sectionCounts.filter((c) => c > 0).length;
      const completionRate = sectionsWithReads / 5;

      await supabase
        .from("scores")
        .update({
          raw_score: newRawScore,
          [sectionReadCol]: newSectionReads,
          completion_rate: completionRate,
          updated_at: new Date().toISOString(),
        })
        .eq("story_id", story_id);
    } else {
      const sectionReadsInit: Record<string, number> = {
        section_1_reads: 0,
        section_2_reads: 0,
        section_3_reads: 0,
        section_4_reads: 0,
        section_5_reads: 0,
      };
      sectionReadsInit[sectionReadCol] = 1;

      await supabase.from("scores").insert({
        story_id,
        raw_score: weighted_value,
        completion_rate: 0.2,
        ...sectionReadsInit,
      });
    }

    // Broadcast realtime event
    await supabase.channel("pops").send({
      type: "broadcast",
      event: "new_pop",
      payload: {
        story_id,
        section_opened,
        weighted_value,
        reader_id: user.id,
      },
    });

    return new Response(JSON.stringify({ pop }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
