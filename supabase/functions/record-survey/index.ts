import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SURVEY_DECAY: Record<string, number> = { A: 1.00, B: 0.95, C: 0.82, D: 0.65 };
const RE_READ_BONUS_PER = 0.3;
const VALID_ANSWERS = ["A", "B", "C", "D"];

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

    const { story_id, q1_answer, q2_answer } = await req.json();

    if (!story_id || !q1_answer || !q2_answer) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!VALID_ANSWERS.includes(q1_answer) || !VALID_ANSWERS.includes(q2_answer)) {
      return new Response(JSON.stringify({ error: "Answers must be A, B, C, or D" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify reader completed all 5 sections
    const { count } = await supabase
      .from("pops")
      .select("id", { count: "exact", head: true })
      .eq("reader_id", user.id)
      .eq("story_id", story_id);

    if ((count ?? 0) < 5) {
      return new Response(JSON.stringify({ error: "Must complete all 5 sections before surveying" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Check for existing survey
    const { data: existing } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("reader_id", user.id)
      .eq("story_id", story_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Survey already submitted" }), {
        status: 409,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Calculate decay
    const decay = (SURVEY_DECAY[q1_answer] + SURVEY_DECAY[q2_answer]) / 2;

    // Insert survey response
    const { error: insertErr } = await supabase
      .from("survey_responses")
      .insert({
        reader_id: user.id,
        story_id,
        q1_answer,
        q2_answer,
        decay_applied: decay,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to insert survey", details: insertErr.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Apply decay to this reader's pops on this story
    if (decay < 1.0) {
      const { data: readerPops } = await supabase
        .from("pops")
        .select("id, weighted_value")
        .eq("reader_id", user.id)
        .eq("story_id", story_id);

      for (const pop of readerPops ?? []) {
        await supabase
          .from("pops")
          .update({ weighted_value: pop.weighted_value * decay })
          .eq("id", pop.id);
      }
    }

    // Recalculate raw_score
    const { data: allPops } = await supabase
      .from("pops")
      .select("weighted_value")
      .eq("story_id", story_id);

    const popSum = (allPops ?? []).reduce(
      (sum: number, p: { weighted_value: number }) => sum + p.weighted_value,
      0,
    );

    const { data: scores } = await supabase
      .from("scores")
      .select("id, reaction_score, re_read_count, garden_boost")
      .eq("story_id", story_id)
      .maybeSingle();

    const reactionScore = scores?.reaction_score ?? 0;
    const reReadCount = scores?.re_read_count ?? 0;
    const gardenBoost = scores?.garden_boost ?? 1.0;
    const rawScore = (popSum * gardenBoost) + reactionScore + (reReadCount * RE_READ_BONUS_PER);

    if (scores) {
      await supabase
        .from("scores")
        .update({ raw_score: rawScore, updated_at: new Date().toISOString() })
        .eq("id", scores.id);
    }

    return new Response(JSON.stringify({ success: true, decay_applied: decay }), {
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
