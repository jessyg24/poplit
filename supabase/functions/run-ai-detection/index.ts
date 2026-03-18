import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_DETECTION_THRESHOLD = 0.65;

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

    const { story_id } = await req.json();

    if (!story_id) {
      return new Response(JSON.stringify({ error: "Missing required field: story_id" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch story content (all 5 sections)
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, section_1, section_2, section_3, section_4, section_5, author_id, ai_assisted, ai_disclaimer")
      .eq("id", story_id)
      .single();

    if (storyError || !story) {
      return new Response(JSON.stringify({ error: "Story not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Concatenate all sections
    const fullContent = [
      story.section_1,
      story.section_2,
      story.section_3,
      story.section_4,
      story.section_5,
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!fullContent.trim()) {
      return new Response(JSON.stringify({ error: "Story has no content" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Call GPTZero API
    const gptzeroApiKey = Deno.env.get("GPTZERO_API_KEY");
    if (!gptzeroApiKey) {
      return new Response(JSON.stringify({ error: "GPTZero API key not configured" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const gptzeroResponse = await fetch("https://api.gptzero.me/v2/predict/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": gptzeroApiKey,
      },
      body: JSON.stringify({ document: fullContent }),
    });

    if (!gptzeroResponse.ok) {
      const errBody = await gptzeroResponse.text();
      return new Response(
        JSON.stringify({ error: "GPTZero API request failed", details: errBody }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const gptzeroResult = await gptzeroResponse.json();
    const aiScore: number = gptzeroResult?.documents?.[0]?.completely_generated_prob ?? 0;
    const aiFlagged = aiScore >= AI_DETECTION_THRESHOLD;

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      ai_score: aiScore,
      ai_flagged: aiFlagged,
      ai_checked_at: new Date().toISOString(),
    };

    // If auto-flagged AND writer did NOT self-disclose, apply penalty (halve pops)
    // NOTE: ai_disclaimer is NOT set here — admin has final say on the public badge.
    // We only record the source so admin can see context.
    const autoFlagged = aiFlagged && !story.ai_assisted;
    if (autoFlagged) {
      updatePayload.ai_disclaimer_source = "auto_flagged";
    } else if (story.ai_assisted && !story.ai_disclaimer_source) {
      updatePayload.ai_disclaimer_source = "self_disclosed";
    }

    // Update story with AI detection results
    const { error: updateError } = await supabase
      .from("stories")
      .update(updatePayload)
      .eq("id", story_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update story", details: updateError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Penalty: halve all prior pops and recalculate score when auto-flagged
    let popsHalved = 0;
    if (autoFlagged) {
      // Halve all existing pop weighted_values for this story
      const { data: existingPops } = await supabase
        .from("pops")
        .select("id, weighted_value")
        .eq("story_id", story_id);

      if (existingPops && existingPops.length > 0) {
        for (const pop of existingPops) {
          await supabase
            .from("pops")
            .update({ weighted_value: pop.weighted_value * 0.5 })
            .eq("id", pop.id);
        }
        popsHalved = existingPops.length;

        // Recalculate raw_score from halved pops
        const { data: updatedPops } = await supabase
          .from("pops")
          .select("weighted_value")
          .eq("story_id", story_id);

        const newRawScore = (updatedPops ?? []).reduce(
          (sum: number, p: { weighted_value: number }) => sum + p.weighted_value,
          0,
        );

        await supabase
          .from("scores")
          .update({ raw_score: newRawScore, updated_at: new Date().toISOString() })
          .eq("story_id", story_id);
      }
    }

    return new Response(
      JSON.stringify({
        story_id,
        ai_score: aiScore,
        ai_flagged: aiFlagged,
        auto_flagged: autoFlagged,
        self_disclosed: story.ai_assisted,
        pops_halved: popsHalved,
        threshold: AI_DETECTION_THRESHOLD,
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
