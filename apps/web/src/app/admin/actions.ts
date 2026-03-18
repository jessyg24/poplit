"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@poplit/core/types";

// ── Users ──────────────────────────────────────────────────────────────────

export async function updateUserRole(userId: string, newRole: UserRole) {
  const admin = createAdminClient();

  // Update the users table
  const { error: dbError } = await admin
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);

  if (dbError) {
    return { error: `Failed to update user role: ${dbError.message}` };
  }

  // Update auth user's app_metadata
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: newRole },
  });

  if (authError) {
    return { error: `Role updated in DB but failed to update auth metadata: ${authError.message}` };
  }

  return { success: true };
}

export async function addEntryCredits(userId: string, amount: number) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
    return { error: "Amount must be an integer between 1 and 100." };
  }

  const admin = createAdminClient();

  const { data: user, error: fetchError } = await admin
    .from("users")
    .select("entry_credits")
    .eq("id", userId)
    .single();

  if (fetchError || !user) {
    return { error: `Failed to fetch user: ${fetchError?.message ?? "Not found"}` };
  }

  const { error } = await admin
    .from("users")
    .update({ entry_credits: (user.entry_credits ?? 0) + amount })
    .eq("id", userId);

  if (error) {
    return { error: `Failed to add credits: ${error.message}` };
  }

  return { success: true, newBalance: (user.entry_credits ?? 0) + amount };
}

export async function toggleWatchlist(
  userId: string,
  addToWatchlist: boolean,
  reason?: string,
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({
      watch_list: addToWatchlist,
      watch_list_reason: addToWatchlist ? (reason || null) : null,
    })
    .eq("id", userId);

  if (error) {
    return { error: `Failed to update watchlist: ${error.message}` };
  }

  return { success: true };
}

export async function updateWatchlistReason(userId: string, reason: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({ watch_list_reason: reason || null })
    .eq("id", userId);

  if (error) {
    return { error: `Failed to update reason: ${error.message}` };
  }

  return { success: true };
}

// ── Strikes ────────────────────────────────────────────────────────────────

export async function issueStrike(
  userId: string,
  issuedBy: string,
  reason: string,
  evidence?: string,
) {
  const admin = createAdminClient();

  const { error } = await admin.from("strikes").insert({
    user_id: userId,
    issued_by: issuedBy,
    reason,
    evidence: evidence || null,
  });

  if (error) {
    return { error: `Failed to issue strike: ${error.message}` };
  }

  return { success: true };
}

export async function updateStrikeStatus(
  strikeId: string,
  status: "reversed" | "expired",
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("strikes")
    .update({ status })
    .eq("id", strikeId);

  if (error) {
    return { error: `Failed to update strike: ${error.message}` };
  }

  return { success: true };
}

// ── Submissions ────────────────────────────────────────────────────────────

export async function approveSubmission(storyId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("stories")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", storyId);

  if (error) {
    return { error: `Failed to approve submission: ${error.message}` };
  }

  return { success: true };
}

export async function rejectSubmission(storyId: string, _reason: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("stories")
    .update({ status: "rejected" })
    .eq("id", storyId);

  if (error) {
    return { error: `Failed to reject submission: ${error.message}` };
  }

  return { success: true };
}

// ── User search (for forms that need to find a user by pen_name) ───────────

export async function searchUsersByPenName(query: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("users")
    .select("id, pen_name, email")
    .ilike("pen_name", `%${query}%`)
    .limit(10);

  if (error) {
    return { error: error.message, users: [] };
  }

  return { users: data ?? [] };
}

// ── Get current admin user ─────────────────────────────────────────────────

export async function getCurrentAdminId() {
  // We import the server client here to get the current session
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Popcycles ─────────────────────────────────────────────────────────────

export async function updatePopcycle(
  popcycleId: string,
  fields: {
    title?: string;
    prompt_theme?: string;
    prompt_1?: string;
    prompt_2?: string;
    prompt_3?: string;
    prompt_4?: string;
    prompt_5?: string;
    description?: string | null;
    format?: string;
    status?: string;
    submissions_open_at?: string;
    submissions_close_at?: string;
    reading_open_at?: string;
    reading_close_at?: string;
    popoff_at?: string;
    entry_fee_cents?: number;
    first_pct?: number;
    second_pct?: number;
    third_pct?: number;
    house_pct?: number;
    sponsor_name?: string | null;
    sponsor_logo_url?: string | null;
  },
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("popcycles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", popcycleId);

  if (error) {
    return { error: `Failed to update popcycle: ${error.message}` };
  }

  return { success: true };
}

export async function deletePopcycle(popcycleId: string) {
  const admin = createAdminClient();

  // Only allow deleting drafts
  const { data: pc, error: fetchError } = await admin
    .from("popcycles")
    .select("status")
    .eq("id", popcycleId)
    .single();

  if (fetchError) {
    return { error: `Failed to fetch popcycle: ${fetchError.message}` };
  }

  if (pc.status !== "draft") {
    return { error: "Only draft popcycles can be deleted." };
  }

  const { error } = await admin
    .from("popcycles")
    .delete()
    .eq("id", popcycleId);

  if (error) {
    return { error: `Failed to delete popcycle: ${error.message}` };
  }

  return { success: true };
}

export async function updatePopcycleStatus(popcycleId: string, newStatus: string) {
  const admin = createAdminClient();

  const validTransitions: Record<string, string[]> = {
    draft: ["scheduled"],
    scheduled: ["submissions_open"],
    submissions_open: ["reading_open"],
    reading_open: ["popoff"],
    popoff: ["completed"],
  };

  // Fetch current status
  const { data: pc, error: fetchError } = await admin
    .from("popcycles")
    .select("status")
    .eq("id", popcycleId)
    .single();

  if (fetchError) {
    return { error: `Failed to fetch popcycle: ${fetchError.message}` };
  }

  const allowed = validTransitions[pc.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from "${pc.status}" to "${newStatus}".` };
  }

  const { error } = await admin
    .from("popcycles")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", popcycleId);

  if (error) {
    return { error: `Failed to update status: ${error.message}` };
  }

  return { success: true };
}

// ── Platform Settings ─────────────────────────────────────────────────────

export async function loadPlatformSettings() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_settings")
    .select("settings")
    .eq("id", "default")
    .single();

  if (error) {
    return { error: `Failed to load settings: ${error.message}`, settings: null };
  }

  return { settings: data?.settings ?? null };
}

export async function savePlatformSettings(settings: Record<string, number>) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_settings")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", "default");

  if (error) {
    return { error: `Failed to save settings: ${error.message}` };
  }

  return { success: true };
}

// ── Scores ────────────────────────────────────────────────────────────────

export async function overrideScore(scoreId: string, newDisplayScore: number) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("scores")
    .update({
      display_score: newDisplayScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scoreId);

  if (error) {
    return { error: `Failed to override score: ${error.message}` };
  }

  return { success: true };
}

export async function recalculateScore(scoreId: string) {
  const admin = createAdminClient();

  // Get the score record to find the story_id
  const { data: score, error: scoreError } = await admin
    .from("scores")
    .select("story_id")
    .eq("id", scoreId)
    .single();

  if (scoreError || !score) {
    return { error: `Failed to fetch score: ${scoreError?.message ?? "Not found"}` };
  }

  // Sum all weighted_value pops for this story
  const { data: pops, error: popsError } = await admin
    .from("pops")
    .select("weighted_value, section_opened, reader_id")
    .eq("story_id", score.story_id);

  if (popsError) {
    return { error: `Failed to fetch pops: ${popsError.message}` };
  }

  const rawScore = (pops ?? []).reduce((sum, p) => sum + Number(p.weighted_value), 0);
  const uniqueReaders = new Set((pops ?? []).map((p) => p.reader_id)).size;
  const s1 = (pops ?? []).filter((p) => p.section_opened === 1).length;
  const s2 = (pops ?? []).filter((p) => p.section_opened === 2).length;
  const s3 = (pops ?? []).filter((p) => p.section_opened === 3).length;
  const s4 = (pops ?? []).filter((p) => p.section_opened === 4).length;
  const s5 = (pops ?? []).filter((p) => p.section_opened === 5).length;
  const completionRate = uniqueReaders > 0 ? s5 / uniqueReaders : 0;

  const { error: updateError } = await admin
    .from("scores")
    .update({
      raw_score: rawScore,
      display_score: Math.floor(rawScore),
      total_readers: uniqueReaders,
      section_1_reads: s1,
      section_2_reads: s2,
      section_3_reads: s3,
      section_4_reads: s4,
      section_5_reads: s5,
      completion_rate: completionRate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scoreId);

  if (updateError) {
    return { error: `Failed to update score: ${updateError.message}` };
  }

  return { success: true, rawScore, displayScore: Math.floor(rawScore) };
}

// ── Payouts ───────────────────────────────────────────────────────────────

export async function initiatePayoutForPopcycle(popcycleId: string) {
  const admin = createAdminClient();

  // Verify popcycle is completed
  const { data: pc, error: pcError } = await admin
    .from("popcycles")
    .select("*")
    .eq("id", popcycleId)
    .single();

  if (pcError || !pc) {
    return { error: `Failed to fetch popcycle: ${pcError?.message ?? "Not found"}` };
  }

  if (pc.status !== "completed") {
    return { error: "Payouts can only be initiated for completed popcycles." };
  }

  // Count published stories for this popcycle
  const { count: storyCount, error: countError } = await admin
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("popcycle_id", popcycleId)
    .eq("status", "published");

  if (countError) {
    return { error: `Failed to count stories: ${countError.message}` };
  }

  const totalRevenueCents = pc.entry_fee_cents * (storyCount ?? 0);
  const prizePoolCents = Math.round(totalRevenueCents * ((100 - pc.house_pct) / 100));
  const houseCutCents = totalRevenueCents - prizePoolCents;
  const firstCents = Math.round(prizePoolCents * (pc.first_pct / (pc.first_pct + pc.second_pct + pc.third_pct)));
  const secondCents = Math.round(prizePoolCents * (pc.second_pct / (pc.first_pct + pc.second_pct + pc.third_pct)));
  const thirdCents = prizePoolCents - firstCents - secondCents;

  // Update prize_pool_cents on the popcycle
  await admin
    .from("popcycles")
    .update({ prize_pool_cents: prizePoolCents, updated_at: new Date().toISOString() })
    .eq("id", popcycleId);

  return {
    success: true,
    breakdown: {
      totalRevenueCents,
      prizePoolCents,
      houseCutCents,
      firstCents,
      secondCents,
      thirdCents,
      storyCount: storyCount ?? 0,
    },
  };
}

// ── Content Taxonomy ──────────────────────────────────────────────────────

interface ContentTaxonomy {
  genres: string[];
  moods: string[];
  triggerWarnings: string[];
}

export async function loadContentTaxonomy(): Promise<{ taxonomy: ContentTaxonomy | null; error?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_settings")
    .select("settings")
    .eq("id", "content_taxonomy")
    .single();

  if (error && error.code === "PGRST116") {
    // Row doesn't exist yet — seed from constants
    const { GENRES, MOODS, TRIGGER_WARNINGS } = await import("@poplit/core/constants");
    const defaults: ContentTaxonomy = {
      genres: [...GENRES],
      moods: [...MOODS],
      triggerWarnings: [...TRIGGER_WARNINGS],
    };

    const { error: insertError } = await admin.from("platform_settings").insert({
      id: "content_taxonomy",
      settings: defaults,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      return { taxonomy: null, error: `Failed to seed taxonomy: ${insertError.message}` };
    }

    return { taxonomy: defaults };
  }

  if (error) {
    return { taxonomy: null, error: `Failed to load taxonomy: ${error.message}` };
  }

  return { taxonomy: (data?.settings as ContentTaxonomy) ?? null };
}

async function saveTaxonomy(taxonomy: ContentTaxonomy) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_settings")
    .update({ settings: taxonomy, updated_at: new Date().toISOString() })
    .eq("id", "content_taxonomy");

  if (error) {
    return { error: `Failed to save taxonomy: ${error.message}` };
  }

  return { success: true };
}

export async function addGenre(genre: string) {
  const { taxonomy, error } = await loadContentTaxonomy();
  if (error || !taxonomy) return { error: error ?? "No taxonomy found" };

  const trimmed = genre.trim();
  if (!trimmed) return { error: "Genre name is required" };
  if (taxonomy.genres.includes(trimmed)) return { error: "Genre already exists" };

  taxonomy.genres.push(trimmed);
  return saveTaxonomy(taxonomy);
}

export async function removeGenre(genre: string) {
  const { taxonomy, error } = await loadContentTaxonomy();
  if (error || !taxonomy) return { error: error ?? "No taxonomy found" };

  taxonomy.genres = taxonomy.genres.filter((g) => g !== genre);
  return saveTaxonomy(taxonomy);
}

export async function addMood(mood: string) {
  const { taxonomy, error } = await loadContentTaxonomy();
  if (error || !taxonomy) return { error: error ?? "No taxonomy found" };

  const trimmed = mood.trim();
  if (!trimmed) return { error: "Mood name is required" };
  if (taxonomy.moods.includes(trimmed)) return { error: "Mood already exists" };

  taxonomy.moods.push(trimmed);
  return saveTaxonomy(taxonomy);
}

export async function removeMood(mood: string) {
  const { taxonomy, error } = await loadContentTaxonomy();
  if (error || !taxonomy) return { error: error ?? "No taxonomy found" };

  taxonomy.moods = taxonomy.moods.filter((m) => m !== mood);
  return saveTaxonomy(taxonomy);
}

export async function addTriggerWarning(tw: string) {
  const { taxonomy, error } = await loadContentTaxonomy();
  if (error || !taxonomy) return { error: error ?? "No taxonomy found" };

  const trimmed = tw.trim();
  if (!trimmed) return { error: "Trigger warning name is required" };
  if (taxonomy.triggerWarnings.includes(trimmed)) return { error: "Trigger warning already exists" };

  taxonomy.triggerWarnings.push(trimmed);
  return saveTaxonomy(taxonomy);
}

export async function removeTriggerWarning(tw: string) {
  const { taxonomy, error } = await loadContentTaxonomy();
  if (error || !taxonomy) return { error: error ?? "No taxonomy found" };

  taxonomy.triggerWarnings = taxonomy.triggerWarnings.filter((t) => t !== tw);
  return saveTaxonomy(taxonomy);
}

// ── Anthology ─────────────────────────────────────────────────────────────

export async function getTopStoriesForPopcycle(popcycleId: string) {
  const admin = createAdminClient();

  const { data: scores, error: scoresError } = await admin
    .from("scores")
    .select("story_id, rank, display_score")
    .eq("popcycle_id", popcycleId)
    .order("rank", { ascending: true })
    .limit(10);

  if (scoresError) {
    return { error: scoresError.message, stories: [] };
  }

  if (!scores || scores.length === 0) {
    return { stories: [] };
  }

  const storyIds = scores.map((s) => s.story_id);
  const { data: stories } = await admin
    .from("stories")
    .select("id, title, author_id")
    .in("id", storyIds);

  const authorIds = [...new Set((stories ?? []).map((s) => s.author_id))];
  const { data: authors } = authorIds.length > 0
    ? await admin.from("users").select("id, pen_name").in("id", authorIds)
    : { data: [] as { id: string; pen_name: string }[] };

  const authorMap: Record<string, string> = {};
  (authors ?? []).forEach((a) => { authorMap[a.id] = a.pen_name; });

  const storyMap: Record<string, { title: string; author_id: string }> = {};
  (stories ?? []).forEach((s) => { storyMap[s.id] = { title: s.title, author_id: s.author_id }; });

  // Check which are already in anthology
  const { data: existing } = await admin
    .from("anthology_entries")
    .select("story_id")
    .in("story_id", storyIds);
  const existingSet = new Set((existing ?? []).map((e) => e.story_id));

  const enriched = scores.map((s) => {
    const story = storyMap[s.story_id];
    return {
      storyId: s.story_id,
      title: story?.title ?? "Unknown",
      author: story ? (authorMap[story.author_id] ?? "Unknown") : "Unknown",
      rank: s.rank,
      displayScore: s.display_score,
      alreadyInAnthology: existingSet.has(s.story_id),
    };
  });

  return { stories: enriched };
}

export async function addToAnthology(storyId: string, popcycleId: string, quarter: string) {
  const admin = createAdminClient();

  // Check if already exists
  const { data: existing } = await admin
    .from("anthology_entries")
    .select("id")
    .eq("story_id", storyId)
    .eq("popcycle_id", popcycleId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "Story is already in the anthology for this popcycle." };
  }

  const { error } = await admin.from("anthology_entries").insert({
    story_id: storyId,
    popcycle_id: popcycleId,
    quarter,
  });

  if (error) {
    return { error: `Failed to add to anthology: ${error.message}` };
  }

  return { success: true };
}

export async function removeFromAnthology(entryId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("anthology_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    return { error: `Failed to remove from anthology: ${error.message}` };
  }

  return { success: true };
}

// ── Wildcards ─────────────────────────────────────────────────────────────

export async function calculateVelocity(storyId: string) {
  const admin = createAdminClient();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Pops in last 24h
  const { count: recentPops } = await admin
    .from("pops")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .gte("created_at", twentyFourHoursAgo.toISOString());

  // Pops in the 24h before that
  const { count: previousPops } = await admin
    .from("pops")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .gte("created_at", fortyEightHoursAgo.toISOString())
    .lt("created_at", twentyFourHoursAgo.toISOString());

  const recent = recentPops ?? 0;
  const previous = previousPops ?? 0;
  const acceleration = previous > 0 ? ((recent - previous) / previous) * 100 : recent > 0 ? 100 : 0;

  return {
    recentPops: recent,
    previousPops: previous,
    acceleration: Math.round(acceleration),
  };
}

export async function awardWildcard(storyId: string, popcycleId: string) {
  const admin = createAdminClient();

  // Get author of the story
  const { data: story, error: storyError } = await admin
    .from("stories")
    .select("author_id, title")
    .eq("id", storyId)
    .single();

  if (storyError || !story) {
    return { error: `Failed to find story: ${storyError?.message ?? "Not found"}` };
  }

  // Award wildcard badge
  const { error: badgeError } = await admin.from("badges").insert({
    user_id: story.author_id,
    badge_type: "wildcard",
  });

  if (badgeError && !badgeError.message.includes("duplicate")) {
    return { error: `Failed to award badge: ${badgeError.message}` };
  }

  // Send notification
  const { error: notifError } = await admin.from("notifications").insert({
    user_id: story.author_id,
    type: "wildcard_awarded",
    title: "Wildcard Awarded!",
    body: `Your story "${story.title}" has been awarded a Wildcard slot!`,
    data: { story_id: storyId, popcycle_id: popcycleId },
  });

  if (notifError) {
    return { error: `Badge awarded but notification failed: ${notifError.message}` };
  }

  return { success: true };
}

// ── Sponsors ──────────────────────────────────────────────────────────────

export async function updateSponsor(
  popcycleId: string,
  sponsorName: string,
  sponsorLogoUrl: string,
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("popcycles")
    .update({
      sponsor_name: sponsorName || null,
      sponsor_logo_url: sponsorLogoUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", popcycleId);

  if (error) {
    return { error: `Failed to update sponsor: ${error.message}` };
  }

  return { success: true };
}

export async function removeSponsor(popcycleId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("popcycles")
    .update({
      sponsor_name: null,
      sponsor_logo_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", popcycleId);

  if (error) {
    return { error: `Failed to remove sponsor: ${error.message}` };
  }

  return { success: true };
}

// ── Dashboard Stats ───────────────────────────────────────────────────────

export async function getDashboardRevenue() {
  const admin = createAdminClient();

  // Total revenue = sum of prize_pool_cents from completed popcycles
  const { data: completed } = await admin
    .from("popcycles")
    .select("prize_pool_cents")
    .eq("status", "completed");

  const totalRevenueCents = (completed ?? []).reduce((sum, pc) => sum + (pc.prize_pool_cents ?? 0), 0);

  // Active prize pool = prize_pool_cents from active popcycles
  const { data: active } = await admin
    .from("popcycles")
    .select("prize_pool_cents")
    .in("status", ["submissions_open", "reading_open", "popoff"]);

  const activePrizePoolCents = (active ?? []).reduce((sum, pc) => sum + (pc.prize_pool_cents ?? 0), 0);

  return { totalRevenueCents, activePrizePoolCents };
}

// ── Analytics ─────────────────────────────────────────────────────────────

export async function fetchAnalyticsTimeSeries(
  table: "users" | "pops" | "stories",
  days: number,
) {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await admin
    .from(table)
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    return { error: error.message, buckets: [] };
  }

  // Group by week
  const buckets: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    const d = new Date(row.created_at);
    // Use Monday-based week key
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const key = monday.toISOString().slice(0, 10);
    buckets[key] = (buckets[key] ?? 0) + 1;
  });

  const sorted = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  return { buckets: sorted };
}

export async function fetchRevenuePerPopcycle() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("popcycles")
    .select("id, title, status, prize_pool_cents, entry_fee_cents")
    .in("status", ["completed", "popoff"])
    .order("created_at", { ascending: true });

  if (error) {
    return { error: error.message, popcycles: [] };
  }

  return { popcycles: data ?? [] };
}
