import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find active popcycles in reading phase (mid-week check)
    const { data: activeCycles, error: cycleError } = await supabase
      .from("popcycles")
      .select("*")
      .eq("status", "reading_open");

    if (cycleError) {
      return new Response(JSON.stringify({ error: "Failed to query popcycles", details: cycleError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!activeCycles || activeCycles.length === 0) {
      return new Response(JSON.stringify({ message: "No active popcycles" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const cycle of activeCycles) {
      // Get all scores for this popcycle, ordered by raw_score desc
      const { data: scores, error: scoresError } = await supabase
        .from("scores")
        .select("story_id, raw_score, updated_at")
        .eq("popcycle_id", cycle.id)
        .order("raw_score", { ascending: false });

      if (scoresError || !scores || scores.length < 4) {
        // Need at least 4 stories to pick a wildcard (top 3 + at least 1 other)
        results.push({ popcycle_id: cycle.id, message: "Not enough stories for wildcard" });
        continue;
      }

      // Top 3 story IDs
      const topThreeIds = new Set(scores.slice(0, 3).map((s) => s.story_id));

      // Get score snapshots from 24 hours ago to calculate velocity
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: snapshots } = await supabase
        .from("score_snapshots")
        .select("story_id, raw_score")
        .eq("popcycle_id", cycle.id)
        .gte("snapshot_at", oneDayAgo);

      const snapshotMap = new Map<string, number>();
      if (snapshots) {
        for (const snap of snapshots) {
          // Use the earliest snapshot in the window as the baseline
          if (!snapshotMap.has(snap.story_id) || snap.raw_score < snapshotMap.get(snap.story_id)!) {
            snapshotMap.set(snap.story_id, snap.raw_score);
          }
        }
      }

      // Calculate velocity for non-top-3 stories
      let bestVelocity = -Infinity;
      let wildcardStory: { story_id: string; velocity: number; raw_score: number } | null = null;

      for (const score of scores) {
        if (topThreeIds.has(score.story_id)) continue;

        const previousScore = snapshotMap.get(score.story_id) ?? 0;
        const velocity = score.raw_score - previousScore;

        if (velocity > bestVelocity) {
          bestVelocity = velocity;
          wildcardStory = {
            story_id: score.story_id,
            velocity,
            raw_score: score.raw_score,
          };
        }
      }

      if (!wildcardStory || wildcardStory.velocity <= 0) {
        results.push({ popcycle_id: cycle.id, message: "No eligible wildcard (no positive velocity)" });
        continue;
      }

      // Get author of wildcard story
      const { data: story } = await supabase
        .from("stories")
        .select("author_id, title")
        .eq("id", wildcardStory.story_id)
        .single();

      if (!story) {
        results.push({ popcycle_id: cycle.id, message: "Wildcard story not found" });
        continue;
      }

      // Award wildcard badge
      await supabase.from("badges").insert({
        user_id: story.author_id,
        badge_type: "wildcard",
        popcycle_id: cycle.id,
        awarded_at: new Date().toISOString(),
      });

      // Mark story as wildcard in scores
      await supabase
        .from("scores")
        .update({ is_wildcard: true })
        .eq("story_id", wildcardStory.story_id)
        .eq("popcycle_id", cycle.id);

      // Send notification
      await supabase.from("notifications").insert({
        user_id: story.author_id,
        type: "wildcard",
        title: "Wildcard Pick!",
        body: `Your story "${story.title}" has been selected as this week's wildcard for its momentum!`,
        data: {
          popcycle_id: cycle.id,
          story_id: wildcardStory.story_id,
          velocity: wildcardStory.velocity,
        },
      });

      results.push({
        popcycle_id: cycle.id,
        wildcard: {
          story_id: wildcardStory.story_id,
          title: story.title,
          velocity: wildcardStory.velocity,
          raw_score: wildcardStory.raw_score,
        },
      });
    }

    return new Response(JSON.stringify({ results }), {
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
