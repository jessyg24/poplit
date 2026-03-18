import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_READ_TIME_MS = 15_000;

const SECTION_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.7,
  4: 2.2,
  5: 3.0,
};

const PAST_WINNER_BOOST_MAX = 0.15;
const TIME_QUALITY_MAX_BONUS = 0.10;
const TIME_QUALITY_CAP_MS = 120_000;
const COMPLETION_BONUS = 1.15;

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

    // Get reader stats for multiplier (0.90–1.10)
    const { data: readerStats } = await supabase
      .from("reader_stats")
      .select("multiplier")
      .eq("user_id", user.id)
      .maybeSingle();

    const readerMultiplier = readerStats?.multiplier ?? 1.0;

    // --- Past winner boost ---
    // Check if this reader won a previous Popoff
    let pastWinnerBoost = 1.0;
    if (story.popcycle_id) {
      const { data: lastWin } = await supabase
        .from("rankings")
        .select("rank, popcycle_id")
        .eq("author_id", user.id)
        .lte("rank", 3)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastWin) {
        // Get the current popcycle to calculate decay
        const { data: currentCycle } = await supabase
          .from("popcycles")
          .select("reading_open_at, reading_close_at")
          .eq("id", story.popcycle_id)
          .single();

        if (currentCycle) {
          const cycleStart = new Date(currentCycle.reading_open_at).getTime();
          const cycleEnd = new Date(currentCycle.reading_close_at).getTime();
          const now = Date.now();
          const cycleDuration = cycleEnd - cycleStart;
          const elapsed = now - cycleStart;
          // Linear decay: full boost at start, 0 at end
          const decayFactor = Math.max(0, 1 - elapsed / cycleDuration);
          pastWinnerBoost = 1.0 + PAST_WINNER_BOOST_MAX * decayFactor;
        }
      }
    }

    // --- Time quality factor ---
    // 1.00 at 15s minimum, scales to 1.10 at 120s, capped there
    const clampedDuration = Math.min(read_duration_ms, TIME_QUALITY_CAP_MS);
    const timeRange = TIME_QUALITY_CAP_MS - MIN_READ_TIME_MS;
    const timeProgress = Math.max(0, (clampedDuration - MIN_READ_TIME_MS) / timeRange);
    const timeQualityFactor = 1.0 + TIME_QUALITY_MAX_BONUS * timeProgress;

    // --- Calculate weighted value ---
    const sectionWeight = SECTION_WEIGHTS[section_opened] ?? 1.0;
    const weighted_value = sectionWeight * readerMultiplier * pastWinnerBoost * timeQualityFactor;

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

    // --- Check if reader completed all 5 sections → apply completion bonus ---
    const { data: allPops } = await supabase
      .from("pops")
      .select("id, section_opened, weighted_value")
      .eq("story_id", story_id)
      .eq("reader_id", user.id);

    const readerSections = new Set((allPops ?? []).map((p) => p.section_opened));
    let completionApplied = false;

    if (readerSections.size === 5) {
      // Reader just completed all sections — retroactively boost all their pops on this story
      for (const p of allPops ?? []) {
        await supabase
          .from("pops")
          .update({ weighted_value: p.weighted_value * COMPLETION_BONUS })
          .eq("id", p.id);
      }
      completionApplied = true;
    }

    // --- Update scores table ---
    const { data: currentScore } = await supabase
      .from("scores")
      .select("*")
      .eq("story_id", story_id)
      .maybeSingle();

    // Recalculate raw_score from all pops (accounts for completion bonus)
    const { data: storyPops } = await supabase
      .from("pops")
      .select("weighted_value")
      .eq("story_id", story_id);

    const newRawScore = (storyPops ?? []).reduce(
      (sum: number, p: { weighted_value: number }) => sum + p.weighted_value,
      0,
    );

    const sectionReadCol = `section_${section_opened}_reads` as const;

    if (currentScore) {
      const newSectionReads = (currentScore[sectionReadCol] ?? 0) + 1;

      // Recalculate completion rate
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
        popcycle_id: story.popcycle_id,
        raw_score: newRawScore,
        display_score: newRawScore,
        total_readers: 1,
        completion_rate: 0.2,
        reaction_score: 0,
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
        completion_bonus_applied: completionApplied,
      },
    });

    return new Response(JSON.stringify({ pop, completion_bonus_applied: completionApplied }), {
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
