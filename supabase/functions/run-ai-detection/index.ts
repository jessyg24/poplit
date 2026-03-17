import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_DETECTION_THRESHOLD = 0.85;

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
      .select("id, section_1, section_2, section_3, section_4, section_5, author_id")
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
    const aiFlagged = aiScore > AI_DETECTION_THRESHOLD;

    // Update story with AI detection results
    const { error: updateError } = await supabase
      .from("stories")
      .update({
        ai_score: aiScore,
        ai_flagged: aiFlagged,
        ai_checked_at: new Date().toISOString(),
      })
      .eq("id", story_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update story", details: updateError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        story_id,
        ai_score: aiScore,
        ai_flagged: aiFlagged,
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
