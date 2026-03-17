import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NUM_SECTIONS = 5;

/**
 * Splits text into N sections at sentence boundaries, balancing word count.
 * Returns an array of N strings.
 */
function splitIntoSections(content: string, n: number): string[] {
  // Split into sentences (handles ., !, ? followed by space or end-of-string)
  const sentences = content.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [content];

  const totalWords = content.split(/\s+/).filter(Boolean).length;
  const targetWordsPerSection = totalWords / n;

  const sections: string[] = [];
  let currentSection: string[] = [];
  let currentWordCount = 0;
  let sectionsRemaining = n;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
    currentSection.push(sentence);
    currentWordCount += sentenceWords;

    const sentencesRemaining = sentences.length - i - 1;

    // Decide whether to break here:
    // Break if we've reached/exceeded the target AND there are enough sentences
    // left for the remaining sections
    if (
      sectionsRemaining > 1 &&
      currentWordCount >= targetWordsPerSection &&
      sentencesRemaining >= sectionsRemaining - 1
    ) {
      sections.push(currentSection.join(" "));
      currentSection = [];
      currentWordCount = 0;
      sectionsRemaining--;
    }
  }

  // Push whatever remains as the last section
  if (currentSection.length > 0) {
    sections.push(currentSection.join(" "));
  }

  // If we ended up with fewer sections than N (e.g., very short content),
  // pad with empty strings. If more, merge extras into the last section.
  while (sections.length < n) {
    sections.push("");
  }
  while (sections.length > n) {
    const extra = sections.pop()!;
    sections[sections.length - 1] += " " + extra;
  }

  return sections;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

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

    // Fetch story content
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, content, author_id")
      .eq("id", story_id)
      .single();

    if (storyError || !story) {
      return new Response(JSON.stringify({ error: "Story not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Verify the requesting user is the author
    if (story.author_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden: you are not the author" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!story.content || !story.content.trim()) {
      return new Response(JSON.stringify({ error: "Story has no content to split" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Split into 5 sections
    const sections = splitIntoSections(story.content, NUM_SECTIONS);

    // Update story with sections
    const { error: updateError } = await supabase
      .from("stories")
      .update({
        section_1: sections[0],
        section_2: sections[1],
        section_3: sections[2],
        section_4: sections[3],
        section_5: sections[4],
        sections_split_at: new Date().toISOString(),
      })
      .eq("id", story_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update story sections", details: updateError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const sectionWordCounts = sections.map((s, i) => ({
      section: i + 1,
      word_count: wordCount(s),
    }));

    return new Response(
      JSON.stringify({
        story_id,
        total_words: wordCount(story.content),
        sections: sectionWordCounts,
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
