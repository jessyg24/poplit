import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RankedStory {
  story_id: string;
  author_id: string;
  raw_score: number;
  completion_rate: number;
  rank: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find popcycles ready to close
    const { data: readyCycles, error: cycleError } = await supabase
      .from("popcycles")
      .select("*")
      .eq("status", "reading_open")
      .lte("reading_close_at", new Date().toISOString());

    if (cycleError) {
      return new Response(JSON.stringify({ error: "Failed to query popcycles", details: cycleError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!readyCycles || readyCycles.length === 0) {
      return new Response(JSON.stringify({ message: "No popcycles ready to close" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const cycle of readyCycles) {
      // Get all scores for stories in this popcycle, ranked by raw_score desc
      const { data: scores, error: scoresError } = await supabase
        .from("scores")
        .select("story_id, raw_score, completion_rate")
        .eq("popcycle_id", cycle.id)
        .order("raw_score", { ascending: false });

      if (scoresError || !scores) {
        results.push({ popcycle_id: cycle.id, error: "Failed to fetch scores" });
        continue;
      }

      // Build rankings
      const rankings: RankedStory[] = [];
      for (let i = 0; i < scores.length; i++) {
        const { data: story } = await supabase
          .from("stories")
          .select("author_id")
          .eq("id", scores[i].story_id)
          .single();

        rankings.push({
          story_id: scores[i].story_id,
          author_id: story?.author_id ?? "",
          raw_score: scores[i].raw_score,
          completion_rate: scores[i].completion_rate,
          rank: i + 1,
        });
      }

      // Prize distribution from the pool: 65% 1st, 12% 2nd, 5% 3rd, 15% house
      const prizePool = cycle.prize_pool ?? 0;
      const prizeShares: Record<number, number> = {
        1: 0.65, // 1st place: 65%
        2: 0.12, // 2nd place: 12%
        3: 0.05, // 3rd place: 5%
        // 15% house (retained by platform)
      };

      // Award cash prizes to top 3 via Stripe Connect transfers
      const cashWinners = rankings.slice(0, 3);
      for (const winner of cashWinners) {
        if (!winner.author_id) continue;

        const prizeAmount = Math.floor(prizePool * (prizeShares[winner.rank] ?? 0) * 100); // cents

        if (prizeAmount <= 0) continue;

        // Get author's Stripe Connect account
        const { data: profile } = await supabase
          .from("users")
          .select("stripe_connect_id")
          .eq("id", winner.author_id)
          .single();

        if (profile?.stripe_connect_id) {
          try {
            const transferResponse = await fetch("https://api.stripe.com/v1/transfers", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                amount: String(prizeAmount),
                currency: "usd",
                destination: profile.stripe_connect_id,
                description: `PopOff prize - Rank #${winner.rank} - Popcycle ${cycle.id}`,
              }),
            });

            if (!transferResponse.ok) {
              console.error(`Transfer failed for ${winner.author_id}:`, await transferResponse.text());
            }
          } catch (transferErr) {
            console.error(`Transfer error for ${winner.author_id}:`, transferErr);
          }
        }

        // Insert ranking record
        await supabase.from("rankings").insert({
          popcycle_id: cycle.id,
          story_id: winner.story_id,
          author_id: winner.author_id,
          rank: winner.rank,
          prize_amount: prizeAmount / 100,
          raw_score: winner.raw_score,
        });

        // Award badges
        const badgeType = winner.rank === 1 ? "champion" : "podium";
        await supabase.from("badges").insert({
          user_id: winner.author_id,
          badge_type: badgeType,
          popcycle_id: cycle.id,
          awarded_at: new Date().toISOString(),
        });

        // Send notification to winner
        await supabase.from("notifications").insert({
          user_id: winner.author_id,
          type: "popoff_result",
          title: winner.rank === 1 ? "You won the PopOff!" : `You placed #${winner.rank}!`,
          body: `Your story finished #${winner.rank} in the PopOff. Prize: $${(prizeAmount / 100).toFixed(2)}`,
          data: { popcycle_id: cycle.id, rank: winner.rank, prize_amount: prizeAmount / 100 },
        });
      }

      // Award 1 free entry credit each to 4th–10th place
      const creditWinners = rankings.slice(3, 10);
      for (const runner of creditWinners) {
        if (!runner.author_id) continue;

        // Increment entry_credits on the user's profile
        const { data: currentProfile } = await supabase
          .from("users")
          .select("entry_credits")
          .eq("id", runner.author_id)
          .single();

        const currentCredits = currentProfile?.entry_credits ?? 0;
        await supabase
          .from("users")
          .update({ entry_credits: currentCredits + 1 })
          .eq("id", runner.author_id);

        // Insert ranking record (no cash prize)
        await supabase.from("rankings").insert({
          popcycle_id: cycle.id,
          story_id: runner.story_id,
          author_id: runner.author_id,
          rank: runner.rank,
          prize_amount: 0,
          raw_score: runner.raw_score,
        });

        // Send notification
        await supabase.from("notifications").insert({
          user_id: runner.author_id,
          type: "popoff_result",
          title: `You placed #${runner.rank}!`,
          body: `Your story finished #${runner.rank} in the PopOff. You earned 1 free entry credit!`,
          data: { popcycle_id: cycle.id, rank: runner.rank, entry_credit: 1 },
        });
      }

      // Update popcycle status to completed
      await supabase
        .from("popcycles")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", cycle.id);

      // --- Series sequel notifications ---
      // Find stories in this Popcycle that have a predecessor (are sequels)
      const { data: sequels } = await supabase
        .from("stories")
        .select("id, title, predecessor_id")
        .eq("popcycle_id", cycle.id)
        .not("predecessor_id", "is", null);

      if (sequels && sequels.length > 0) {
        for (const sequel of sequels) {
          // Get predecessor title
          const { data: predecessor } = await supabase
            .from("stories")
            .select("title")
            .eq("id", sequel.predecessor_id)
            .single();

          const predecessorTitle = predecessor?.title ?? "a previous story";

          // Find readers who completed the predecessor (5 pops) or have it in their garden
          const { data: completedReaders } = await supabase
            .from("pops")
            .select("reader_id")
            .eq("story_id", sequel.predecessor_id)
            .eq("section_opened", 5);

          const { data: gardenReaders } = await supabase
            .from("poppy_gardens")
            .select("reader_id")
            .eq("story_id", sequel.predecessor_id);

          // Combine unique reader IDs
          const readerSet = new Set<string>();
          for (const r of completedReaders ?? []) readerSet.add(r.reader_id);
          for (const r of gardenReaders ?? []) readerSet.add(r.reader_id);

          // Send notification to each reader
          const notifications = Array.from(readerSet).map((readerId) => ({
            user_id: readerId,
            type: "series_sequel_available" as const,
            title: "A sequel is here!",
            body: `${sequel.title} — the next part after ${predecessorTitle} — just finished its PopOff!`,
            data: {
              story_id: sequel.id,
              predecessor_id: sequel.predecessor_id,
              popcycle_id: cycle.id,
            },
          }));

          if (notifications.length > 0) {
            await supabase.from("notifications").insert(notifications);
          }
        }
      }

      results.push({
        popcycle_id: cycle.id,
        stories_ranked: rankings.length,
        winners: cashWinners.map((w) => ({
          rank: w.rank,
          story_id: w.story_id,
          score: w.raw_score,
        })),
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
