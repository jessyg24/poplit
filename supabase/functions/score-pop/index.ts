import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_READ_TIME_MS = 15_000;
const RE_READ_BONUS_PER = 0.3;

const SECTION_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.4,
  4: 1.6,
  5: 2.0,
};

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate story is published
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, status, author_id, popcycle_id")
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

    // Check if section already read by this user
    const { data: existingPop } = await supabase
      .from("pops")
      .select("id")
      .eq("story_id", story_id)
      .eq("reader_id", user.id)
      .eq("section_opened", section_opened)
      .maybeSingle();

    let reRead = false;

    if (existingPop) {
      // Re-read: increment re_read_count instead of erroring
      const { data: currentScore } = await supabase
        .from("scores")
        .select("id, re_read_count")
        .eq("story_id", story_id)
        .maybeSingle();

      if (currentScore) {
        await supabase
          .from("scores")
          .update({
            re_read_count: (currentScore.re_read_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentScore.id);
      }
      reRead = true;
    } else {
      // Get reader multiplier
      const { data: readerStats } = await supabase
        .from("reader_stats")
        .select("multiplier")
        .eq("user_id", user.id)
        .maybeSingle();

      const readerMultiplier = readerStats?.multiplier ?? 1.0;
      const sectionWeight = SECTION_WEIGHTS[section_opened] ?? 1.0;
      const weighted_value = sectionWeight * readerMultiplier;

      // Insert pop
      const { error: popError } = await supabase
        .from("pops")
        .insert({
          story_id,
          reader_id: user.id,
          section_opened,
          read_duration_ms,
          weighted_value,
        });

      if (popError) {
        return new Response(JSON.stringify({ error: "Failed to insert pop", details: popError.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // Recalculate raw_score
    const { data: storyPops } = await supabase
      .from("pops")
      .select("weighted_value")
      .eq("story_id", story_id);

    const popSum = (storyPops ?? []).reduce(
      (sum: number, p: { weighted_value: number }) => sum + p.weighted_value,
      0,
    );

    const { data: currentScore } = await supabase
      .from("scores")
      .select("*")
      .eq("story_id", story_id)
      .maybeSingle();

    const reactionScore = currentScore?.reaction_score ?? 0;
    const reReadCount = currentScore?.re_read_count ?? 0;
    const gardenBoost = currentScore?.garden_boost ?? 1.0;
    const rawScore = (popSum * gardenBoost) + reactionScore + (reReadCount * RE_READ_BONUS_PER);

    const sectionReadCol = `section_${section_opened}_reads` as const;

    // Count unique readers
    const { data: uniqueReaders } = await supabase
      .from("pops")
      .select("reader_id")
      .eq("story_id", story_id);
    const totalReaders = new Set((uniqueReaders ?? []).map((r: { reader_id: string }) => r.reader_id)).size;

    if (currentScore) {
      const updateData: Record<string, unknown> = {
        raw_score: rawScore,
        display_score: rawScore,
        total_readers: totalReaders,
        updated_at: new Date().toISOString(),
      };

      if (!reRead) {
        updateData[sectionReadCol] = (currentScore[sectionReadCol] ?? 0) + 1;
        // Recalculate completion rate
        const sectionCounts = [1, 2, 3, 4, 5].map((s) => {
          if (s === section_opened) return ((currentScore as any)[`section_${s}_reads`] ?? 0) + 1;
          return (currentScore as any)[`section_${s}_reads`] ?? 0;
        });
        const sectionsWithReads = sectionCounts.filter((c) => c > 0).length;
        updateData.completion_rate = sectionsWithReads / 5;
      }

      await supabase
        .from("scores")
        .update(updateData)
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
        popcycle_id: story.popcycle_id,
        raw_score: rawScore,
        display_score: rawScore,
        total_readers: 1,
        completion_rate: 0.2,
        reaction_score: 0,
        re_read_count: 0,
        garden_count: 0,
        garden_boost: 1.0,
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
        reader_id: user.id,
        re_read: reRead,
      },
    });

    return new Response(JSON.stringify({ success: true, re_read: reRead }), {
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
