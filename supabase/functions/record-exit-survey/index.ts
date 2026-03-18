import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_REASONS = ["A", "B", "C", "D", "E", "F"];

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

    const { story_id, section_stopped_at, reason } = await req.json();

    if (!story_id || !section_stopped_at || !reason) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (section_stopped_at < 1 || section_stopped_at > 4) {
      return new Response(JSON.stringify({ error: "section_stopped_at must be 1-4" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!VALID_REASONS.includes(reason)) {
      return new Response(JSON.stringify({ error: "reason must be A-F" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify reader has >=1 and <5 pops
    const { count } = await supabase
      .from("pops")
      .select("id", { count: "exact", head: true })
      .eq("reader_id", user.id)
      .eq("story_id", story_id);

    if ((count ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "Must read at least 1 section" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Story already completed — use ending survey instead" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Check for existing exit survey
    const { data: existing } = await supabase
      .from("exit_surveys")
      .select("id")
      .eq("reader_id", user.id)
      .eq("story_id", story_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Exit survey already submitted" }), {
        status: 409,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Insert — no scoring effect
    const { error: insertErr } = await supabase
      .from("exit_surveys")
      .insert({
        reader_id: user.id,
        story_id,
        section_stopped_at,
        reason,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to insert exit survey", details: insertErr.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
