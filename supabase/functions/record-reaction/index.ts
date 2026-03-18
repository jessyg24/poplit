import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_REACTIONS_PER_READER = 10;

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

    const { story_id, section, start_offset, end_offset, reaction_type, text_snippet } = await req.json();

    // Validate required fields
    if (!story_id || !section || start_offset == null || end_offset == null || !reaction_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: story_id, section, start_offset, end_offset, reaction_type" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (section < 1 || section > 5) {
      return new Response(JSON.stringify({ error: "Section must be between 1 and 5" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (reaction_type !== "up" && reaction_type !== "down") {
      return new Response(JSON.stringify({ error: "reaction_type must be 'up' or 'down'" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify reader has read this section (has a pop record)
    const { data: pop } = await supabase
      .from("pops")
      .select("id")
      .eq("reader_id", user.id)
      .eq("story_id", story_id)
      .eq("section_opened", section)
      .maybeSingle();

    if (!pop) {
      return new Response(JSON.stringify({ error: "You must read this section before reacting" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Enforce max 10 reactions per reader per story
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

    // Insert reaction
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
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to insert reaction", details: insertError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Get reader's multiplier for weighted reaction scoring
    const { data: readerStats } = await supabase
      .from("reader_stats")
      .select("multiplier")
      .eq("user_id", user.id)
      .maybeSingle();

    const readerMultiplier = readerStats?.multiplier ?? 1.0;
    const reactionValue = reaction_type === "up" ? readerMultiplier : -readerMultiplier;

    // Update scores.reaction_score
    const { data: currentScore } = await supabase
      .from("scores")
      .select("reaction_score")
      .eq("story_id", story_id)
      .maybeSingle();

    if (currentScore) {
      await supabase
        .from("scores")
        .update({
          reaction_score: (currentScore.reaction_score ?? 0) + reactionValue,
          updated_at: new Date().toISOString(),
        })
        .eq("story_id", story_id);
    }

    return new Response(
      JSON.stringify({
        reaction,
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
