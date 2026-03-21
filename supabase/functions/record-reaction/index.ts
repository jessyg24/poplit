import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_REACTIONS_PER_READER = 10;
const OVERLAP_CHARS = 50;
const TIER1_COUNT = 3;
const TIER1_MULTIPLIER = 1.25;
const TIER2_COUNT = 5;
const TIER2_MULTIPLIER = 1.50;
const RE_READ_BONUS_PER = 0.3;

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

    const { story_id, section, start_offset, end_offset, text_snippet, reaction_type: rawReactionType } = await req.json();

    // Validate and default reaction_type
    const VALID_REACTION_TYPES = ["like", "love", "laugh", "cry"];
    const reaction_type = VALID_REACTION_TYPES.includes(rawReactionType) ? rawReactionType : "like";

    // Validate required fields
    if (!story_id || !section || start_offset == null || end_offset == null) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: story_id, section, start_offset, end_offset" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (section < 1 || section > 5) {
      return new Response(JSON.stringify({ error: "Section must be between 1 and 5" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enforce max reactions per reader per story
    const { count } = await supabase
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("reader_id", user.id)
      .eq("story_id", story_id);

    if ((count ?? 0) >= MAX_REACTIONS_PER_READER) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_REACTIONS_PER_READER} reactions per story reached` }),
        { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Calculate convergence bonus — count overlapping reactions in same section
    const { data: nearby } = await supabase
      .from("reactions")
      .select("id, start_offset")
      .eq("story_id", story_id)
      .eq("section", section)
      .gte("start_offset", start_offset - OVERLAP_CHARS)
      .lte("start_offset", start_offset + OVERLAP_CHARS);

    const overlapCount = (nearby ?? []).length;
    let convergenceMultiplier = 1.0;
    if (overlapCount >= TIER2_COUNT) {
      convergenceMultiplier = TIER2_MULTIPLIER;
    } else if (overlapCount >= TIER1_COUNT) {
      convergenceMultiplier = TIER1_MULTIPLIER;
    }

    // Insert reaction (up-only)
    const { data: reaction, error: insertError } = await supabase
      .from("reactions")
      .insert({
        reader_id: user.id,
        story_id,
        section,
        start_offset,
        end_offset,
        reaction_type,
        text_snippet: (text_snippet ?? "").slice(0, 500),
        convergence_multiplier: convergenceMultiplier,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to insert reaction", details: insertError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Recalculate full reaction_score for this story
    const { data: allReactions } = await supabase
      .from("reactions")
      .select("convergence_multiplier, reaction_type")
      .eq("story_id", story_id);

    const REACTION_WEIGHTS: Record<string, number> = { like: 1.0, love: 1.5, laugh: 2.0, cry: 2.0 };
    const reactionScore = (allReactions ?? []).reduce(
      (sum: number, r: { convergence_multiplier: number; reaction_type: string }) =>
        sum + (r.convergence_multiplier ?? 1.0) * (REACTION_WEIGHTS[r.reaction_type] ?? 1.0),
      0,
    );

    // Recalc raw_score
    const { data: pops } = await supabase
      .from("pops")
      .select("weighted_value")
      .eq("story_id", story_id);
    const popSum = (pops ?? []).reduce(
      (sum: number, p: { weighted_value: number }) => sum + p.weighted_value,
      0,
    );

    const { data: scores } = await supabase
      .from("scores")
      .select("id, re_read_count, garden_boost")
      .eq("story_id", story_id)
      .maybeSingle();

    const reReadCount = scores?.re_read_count ?? 0;
    const gardenBoost = scores?.garden_boost ?? 1.0;
    const rawScore = (popSum * gardenBoost) + reactionScore + (reReadCount * RE_READ_BONUS_PER);

    if (scores) {
      await supabase
        .from("scores")
        .update({
          reaction_score: reactionScore,
          raw_score: rawScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scores.id);
    }

    return new Response(
      JSON.stringify({
        reaction,
        convergence_multiplier: convergenceMultiplier,
        reactions_remaining: MAX_REACTIONS_PER_READER - ((count ?? 0) + 1),
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
