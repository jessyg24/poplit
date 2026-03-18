"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { useModeStore } from "@/stores/mode";
import {
  storyDraftSchema,
  type StoryDraftInput,
  storySubmissionSchema,
  type StorySubmissionInput,
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@poplit/core/validation";
import {
  GENRES,
  MOODS,
  TRIGGER_WARNINGS,
  STORY_LIMITS,
  ENTRY_FEE_CENTS,
  PRIZE_DISTRIBUTION,
  SUBSCRIPTION_TIERS,
  MAX_GENRES_PER_STORY,
} from "@poplit/core/constants";
import { countWords, formatCents, formatCountdown, splitIntoSections } from "@poplit/core/utils";

/* ---------- types ---------- */

type Tab = "overview" | "stories" | "submit" | "popoff" | "garden" | "billing" | "credits" | "settings";

interface UserProfile {
  id: string;
  pen_name: string;
  real_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string;
  role: string;
  entry_credits: number;
  invite_code: string;
  pen_name_changed_at: string | null;
  created_at: string;
}

interface StoryWithScore {
  id: string;
  title: string;
  status: string;
  genre: string[];
  created_at: string;
  display_score: number;
  total_readers: number;
  completion_rate: number;
  rank: number | null;
  garden_count: number;
  exitReasons: Record<string, number>;
  exitAvgSection: number | null;
  exitTotal: number;
}

interface Popcycle {
  id: string;
  title: string;
  prompt_theme: string;
  prompt_1: string;
  prompt_2: string;
  prompt_3: string;
  prompt_4: string;
  prompt_5: string;
  status: string;
  submissions_open_at: string;
  submissions_close_at: string;
  reading_open_at: string;
  reading_close_at: string;
  popoff_at: string;
  prize_pool_cents: number;
  entry_fee_cents: number;
}

interface PopoffStory {
  rank: number;
  title: string;
  penName: string;
  displayScore: number;
  completionRate: number;
}

/* ---------- component ---------- */

export function WritingMode({ isAdmin = false }: { isAdmin?: boolean }) {
  const supabase = createClient();
  const setMode = useModeStore((s) => s.setMode);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Data
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stories, setStories] = useState<StoryWithScore[]>([]);
  const [popcycle, setPopcycle] = useState<Popcycle | null>(null);
  const [popoffStories, setPopoffStories] = useState<PopoffStory[]>([]);
  const [userPopoffRank, setUserPopoffRank] = useState<number | null>(null);

  // Load all data
  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser({
          ...profile,
          email: authUser.email ?? "",
        } as UserProfile);
      }

      // Fetch stories with scores
      const { data: storyData } = await supabase
        .from("stories")
        .select("*, scores(*)")
        .eq("author_id", authUser.id)
        .order("created_at", { ascending: false });

      if (storyData) {
        const storyIds = storyData.map((s: any) => s.id);

        // Fetch exit surveys for all stories
        const { data: exits } = await supabase
          .from("exit_surveys")
          .select("story_id, section_stopped_at, reason")
          .in("story_id", storyIds);

        const exitMap: Record<string, { reasons: Record<string, number>; sections: number[]; total: number }> = {};
        for (const e of exits ?? []) {
          if (!exitMap[e.story_id]) exitMap[e.story_id] = { reasons: {}, sections: [], total: 0 };
          const entry = exitMap[e.story_id]!;
          entry.reasons[e.reason] = (entry.reasons[e.reason] || 0) + 1;
          entry.sections.push(e.section_stopped_at);
          entry.total += 1;
        }

        // Fetch garden counts
        const { data: gardens } = await supabase
          .from("poppy_gardens")
          .select("story_id")
          .in("story_id", storyIds);

        const gardenMap: Record<string, number> = {};
        for (const g of gardens ?? []) {
          gardenMap[g.story_id] = (gardenMap[g.story_id] || 0) + 1;
        }

        setStories(
          storyData.map((s: any) => {
            const score = s.scores?.[0] ?? null;
            const exit = exitMap[s.id];
            return {
              id: s.id,
              title: s.title,
              status: s.status,
              genre: s.genre,
              created_at: s.created_at,
              display_score: score?.display_score ?? 0,
              total_readers: score?.total_readers ?? 0,
              completion_rate: score?.completion_rate ?? 0,
              rank: score?.rank ?? null,
              garden_count: gardenMap[s.id] ?? 0,
              exitReasons: exit?.reasons ?? {},
              exitAvgSection: exit ? exit.sections.reduce((a: number, b: number) => a + b, 0) / exit.sections.length : null,
              exitTotal: exit?.total ?? 0,
            };
          })
        );
      }

      // Fetch active popcycle
      const { data: popcycleData } = await supabase
        .from("popcycles")
        .select("*")
        .in("status", ["submissions_open", "reading_open", "popoff", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (popcycleData) {
        setPopcycle(popcycleData as Popcycle);

        // If popoff/completed, load top stories
        if (popcycleData.status === "popoff" || popcycleData.status === "completed") {
          const { data: scores } = await supabase
            .from("scores")
            .select("*, stories(title, hook, users!author_id(pen_name, real_name))")
            .eq("popcycle_id", popcycleData.id)
            .order("display_score", { ascending: false });

          if (scores) {
            setPopoffStories(
              scores.slice(0, 3).map((sc: any, i: number) => ({
                rank: i + 1,
                title: sc.stories?.title ?? "Unknown",
                penName: sc.stories?.users?.pen_name ?? "unknown",
                displayScore: sc.display_score,
                completionRate: sc.completion_rate,
              }))
            );
            // Find user's rank
            const userIdx = scores.findIndex(
              (sc: any) => sc.stories?.users?.pen_name === profile?.pen_name
            );
            if (userIdx >= 0) setUserPopoffRank(userIdx + 1);
          }
        }
      }

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  }, [supabase]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "stories", label: "My Stories" },
    { key: "submit", label: "Submit" },
    { key: "popoff", label: "Popoff" },
    { key: "garden", label: "Garden" },
    { key: "billing", label: "Billing" },
    { key: "credits", label: "Credits" },
    { key: "settings", label: "Settings" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex-shrink-0">
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-orange-500">Pop</span>
                <span className="text-slate-800">Lit</span>
              </span>
            </div>

            {/* Tabs (center) */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.key
                      ? "text-purple-700 bg-purple-50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <a
                  href="/admin"
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                >
                  Admin
                </a>
              )}
              <button
                onClick={() => setMode("reading")}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors"
              >
                Switch to Reading
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {loggingOut ? "..." : "Logout"}
              </button>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden -mb-px overflow-x-auto flex gap-1 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? "text-purple-700 bg-purple-50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active tab underline bar */}
        <div className="hidden md:block max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <div
                  key={tab.key}
                  className={`h-0.5 rounded-full transition-all duration-200 ${
                    activeTab === tab.key ? "w-8 bg-purple-500" : "w-8 bg-transparent"
                  }`}
                  style={{ marginInline: "2px" }}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "overview" && (
          <OverviewTab user={user} stories={stories} popcycle={popcycle} />
        )}
        {activeTab === "stories" && (
          <MyStoriesTab user={user} supabase={supabase} onSubmit={() => setActiveTab("submit")} />
        )}
        {activeTab === "submit" && (
          <SubmitTab user={user} popcycle={popcycle} supabase={supabase} />
        )}
        {activeTab === "popoff" && (
          <PopoffTab
            popcycle={popcycle}
            popoffStories={popoffStories}
            userRank={userPopoffRank}
          />
        )}
        {activeTab === "garden" && (
          <GardenTab supabase={supabase} setMode={setMode} />
        )}
        {activeTab === "billing" && <BillingTab user={user} />}
        {activeTab === "credits" && <CreditsTab user={user} />}
        {activeTab === "settings" && <SettingsTab user={user} supabase={supabase} />}
      </main>
    </div>
  );
}

/* ====================================================================
   TAB: Overview
   ==================================================================== */

function OverviewTab({
  user,
  stories,
  popcycle,
}: {
  user: UserProfile | null;
  stories: StoryWithScore[];
  popcycle: Popcycle | null;
}) {
  const totalPops = stories.reduce((sum, s) => sum + s.display_score, 0);
  const bestRank = stories
    .filter((s) => s.rank !== null)
    .reduce(
      (best, s) => (s.rank !== null && (best === null || s.rank < best) ? s.rank : best),
      null as number | null
    );

  const statCards = [
    { label: "Total Pops", value: Math.round(totalPops).toLocaleString() },
    { label: "Stories Submitted", value: stories.length.toString() },
    { label: "Best Finish", value: bestRank !== null ? `#${bestRank}` : "--" },
    { label: "Entry Credits", value: (user?.entry_credits ?? 0).toString() },
    { label: "Total Earnings", value: "$0.00" },
    {
      label: "Current Popcycle",
      value: popcycle ? popcycle.title : "None",
      sub: popcycle ? formatCountdown(popcycle.popoff_at) + " to Popoff" : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
          Welcome back, {user?.pen_name ?? "Writer"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here is your writing dashboard overview.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-800">{value}</p>
            {sub && (
              <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Active popcycle info */}
      {popcycle && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            Active Popcycle: {popcycle.title}
          </h2>
          <p className="text-sm font-medium text-slate-600 mb-2">{popcycle.prompt_theme}</p>
          <ul className="text-sm text-slate-500 mb-4 space-y-1 list-disc list-inside">
            {[popcycle.prompt_1, popcycle.prompt_2, popcycle.prompt_3, popcycle.prompt_4, popcycle.prompt_5]
              .filter(Boolean)
              .map((p, i) => (
                <li key={i}>{p}</li>
              ))}
          </ul>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span>
              Status:{" "}
              <span className="font-semibold text-slate-600">
                {popcycle.status.replace(/_/g, " ")}
              </span>
            </span>
            <span>
              Submissions close:{" "}
              <span className="font-semibold text-slate-600">
                {new Date(popcycle.submissions_close_at).toLocaleDateString()}
              </span>
            </span>
            <span>
              Popoff:{" "}
              <span className="font-semibold text-slate-600">
                {new Date(popcycle.popoff_at).toLocaleDateString()}
              </span>
            </span>
            <span>
              Prize pool:{" "}
              <span className="font-semibold text-slate-600">
                {formatCents(popcycle.prize_pool_cents)}
              </span>
            </span>
          </div>
        </section>
      )}

      {/* Recent stories */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Your Stories</h2>
        {stories.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-slate-200 bg-white">
            <p className="text-slate-400">You haven&apos;t submitted any stories yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Head to the Submit tab to enter your first story.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <div
                key={story.id}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800 truncate">
                        {story.title}
                      </h3>
                      <StatusBadge status={story.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {story.genre.join(", ")} &middot;{" "}
                      {new Date(story.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold text-purple-600">
                      {story.display_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-400">score</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span>{story.total_readers} readers</span>
                  <span>
                    {(story.completion_rate * 100).toFixed(0)}% completion
                  </span>
                  {story.rank !== null && <span>Rank #{story.rank}</span>}
                  {story.garden_count > 0 && (
                    <span className="text-green-600 font-semibold">
                      🌻 {story.garden_count} garden{story.garden_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {story.exitTotal > 0 && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs">
                    <p className="text-red-600 dark:text-red-400 font-semibold">
                      {story.exitTotal} reader{story.exitTotal !== 1 ? "s" : ""} stopped early
                      {story.exitAvgSection !== null && ` (avg section ${story.exitAvgSection.toFixed(1)})`}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      {Object.entries(story.exitReasons)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([key, count]) => {
                          const labels: Record<string, string> = {
                            A: "not my taste", B: "lost interest", C: "pacing",
                            D: "writing quality", E: "busy", F: "content warning",
                          };
                          return `${count} ${labels[key] || key}`;
                        })
                        .join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ====================================================================
   TAB: My Stories
   ==================================================================== */

interface DraftStory {
  id: string;
  title: string;
  hook: string | null;
  genre: string[];
  mood: string | null;
  triggers: string[];
  content: string | null;
  word_count: number;
  ai_assisted: boolean;
  status: string;
  popcycle_id: string | null;
  predecessor_id: string | null;
  created_at: string;
  updated_at: string;
}

function MyStoriesTab({
  user,
  supabase,
  onSubmit,
}: {
  user: UserProfile | null;
  supabase: ReturnType<typeof createClient>;
  onSubmit: () => void;
}) {
  const [drafts, setDrafts] = useState<DraftStory[]>([]);
  const [submitted, setSubmitted] = useState<DraftStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  // Load stories
  const loadStories = useCallback(async () => {
    if (!user) return;

    const [{ data: draftData }, { data: submittedData }] = await Promise.all([
      supabase
        .from("stories")
        .select("*")
        .eq("author_id", user.id)
        .is("popcycle_id", null)
        .eq("status", "draft")
        .order("updated_at", { ascending: false }),
      supabase
        .from("stories")
        .select("*")
        .eq("author_id", user.id)
        .not("popcycle_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);

    setDrafts((draftData as DraftStory[]) ?? []);
    setSubmitted((submittedData as DraftStory[]) ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Create new draft
  async function handleNewDraft() {
    if (!user) return;
    setSaveError(null);

    const { data, error } = await supabase
      .from("stories")
      .insert({
        author_id: user.id,
        title: "Untitled Draft",
        hook: "",
        genre: [],
        mood: null,
        triggers: [],
        content: "",
        section_1: "",
        section_2: "",
        section_3: "",
        section_4: "",
        section_5: "",
        word_count: 0,
        status: "draft",
        ai_assisted: false,
      })
      .select("*")
      .single();

    if (error || !data) {
      setSaveError(error?.message ?? "Failed to create draft.");
      return;
    }

    setDrafts((prev) => [data as DraftStory, ...prev]);
    setEditingId(data.id);
  }

  // Delete draft
  async function handleDelete(id: string) {
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirm(null);
    if (editingId === id) setEditingId(null);
  }

  // Link as sequel
  async function handleLink(storyId: string, predecessorId: string | null) {
    const { error } = await supabase
      .from("stories")
      .update({ predecessor_id: predecessorId })
      .eq("id", storyId);

    if (!error) {
      setDrafts((prev) =>
        prev.map((d) => (d.id === storyId ? { ...d, predecessor_id: predecessorId } : d))
      );
      setSubmitted((prev) =>
        prev.map((d) => (d.id === storyId ? { ...d, predecessor_id: predecessorId } : d))
      );
    }
    setLinkingId(null);
  }

  // Group submitted stories into series by following predecessor_id chains
  const seriesGroups = (() => {
    const allStories = [...submitted];
    const byId = new Map(allStories.map((s) => [s.id, s]));
    const visited = new Set<string>();
    const groups: DraftStory[][] = [];

    for (const story of allStories) {
      if (visited.has(story.id)) continue;

      // Walk back to find the root
      let root = story;
      while (root.predecessor_id && byId.has(root.predecessor_id)) {
        root = byId.get(root.predecessor_id)!;
      }

      // Walk forward to build chain
      const chain: DraftStory[] = [root];
      visited.add(root.id);
      let current = root;
      const children = new Map<string, DraftStory>();
      for (const s of allStories) {
        if (s.predecessor_id) children.set(s.predecessor_id, s);
      }
      while (children.has(current.id)) {
        const next = children.get(current.id)!;
        if (visited.has(next.id)) break;
        chain.push(next);
        visited.add(next.id);
        current = next;
      }

      groups.push(chain);
    }

    // Also add standalone stories not yet visited
    for (const story of allStories) {
      if (!visited.has(story.id)) {
        groups.push([story]);
        visited.add(story.id);
      }
    }

    return groups;
  })();

  // All published stories for "link as sequel" dropdown
  const publishedForLinking = submitted.filter(
    (s) => s.status === "published" || s.status === "approved" || s.status === "pending_review"
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
            My Stories
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your drafts and view submitted stories.
          </p>
        </div>
        <button
          onClick={handleNewDraft}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          + New Draft
        </button>
      </div>

      {saveError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {saveError}
        </div>
      )}

      {/* Drafts */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Drafts</h2>
        {drafts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-slate-200 bg-white">
            <p className="text-slate-400">No drafts yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Click &quot;New Draft&quot; to start writing.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div key={draft.id}>
                {editingId === draft.id ? (
                  <DraftEditor
                    draft={draft}
                    supabase={supabase}
                    inputClass={inputClass}
                    labelClass={labelClass}
                    onSave={(updated) => {
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === updated.id ? updated : d))
                      );
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    onError={(msg) => setSaveError(msg)}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 hover:border-purple-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-slate-800 truncate">
                          {draft.title || "Untitled"}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {draft.genre.map((g) => (
                            <span
                              key={g}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {draft.word_count.toLocaleString()} words &middot; Last edited{" "}
                          {new Date(draft.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setEditingId(draft.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          Edit
                        </button>
                        {deleteConfirm === draft.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(draft.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(draft.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submitted / Published (series grouped) */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          Submitted &amp; Published
        </h2>
        {seriesGroups.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-slate-200 bg-white">
            <p className="text-slate-400">
              No submitted stories yet.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Submit a draft to a Popcycle to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {seriesGroups.map((group, gi) => (
              <div key={gi}>
                {group.length > 1 && (
                  <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">
                    Series ({group.length} parts)
                  </p>
                )}
                <div className="space-y-2">
                  {group.map((story, si) => (
                    <div
                      key={story.id}
                      className={`rounded-xl border border-slate-200 bg-white p-5 ${group.length > 1 && si > 0 ? "ml-4 border-l-4 border-l-purple-200" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800 truncate">
                              {story.title}
                            </h3>
                            <StatusBadge status={story.status} />
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {story.genre.map((g) => (
                              <span
                                key={g}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {story.word_count.toLocaleString()} words &middot;{" "}
                            {new Date(story.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Link as sequel */}
                      {linkingId === story.id ? (
                        <div className="mt-3 flex items-center gap-2">
                          <select
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                            defaultValue={story.predecessor_id ?? ""}
                            onChange={(e) => handleLink(story.id, e.target.value || null)}
                          >
                            <option value="">No predecessor (standalone)</option>
                            {publishedForLinking
                              .filter((s) => s.id !== story.id)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.title}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => setLinkingId(null)}
                            className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLinkingId(story.id)}
                          className="mt-2 text-xs font-medium text-purple-500 hover:text-purple-700 transition-colors"
                        >
                          Link as sequel to...
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA to submit */}
      <div className="text-center pt-4">
        <button
          onClick={onSubmit}
          className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
        >
          Submit a Draft to Popcycle
        </button>
      </div>
    </div>
  );
}

/* ---------- Draft Editor (inline) ---------- */

function DraftEditor({
  draft,
  supabase,
  inputClass,
  labelClass,
  onSave,
  onCancel,
  onError,
}: {
  draft: DraftStory;
  supabase: ReturnType<typeof createClient>;
  inputClass: string;
  labelClass: string;
  onSave: (updated: DraftStory) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StoryDraftInput>({
    resolver: zodResolver(storyDraftSchema),
    defaultValues: {
      title: draft.title,
      hook: draft.hook ?? "",
      genre: draft.genre ?? [],
      mood: draft.mood ?? "",
      triggers: draft.triggers ?? [],
      content: draft.content ?? "",
      ai_assisted: draft.ai_assisted,
    },
  });

  const contentValue = watch("content") ?? "";
  const wordCount = contentValue ? countWords(contentValue) : 0;
  const hookValue = watch("hook") ?? "";

  async function onSubmitDraft(data: StoryDraftInput) {
    const wc = countWords(data.content ?? "");

    const { data: updated, error } = await supabase
      .from("stories")
      .update({
        title: data.title,
        hook: data.hook ?? "",
        genre: data.genre ?? [],
        mood: data.mood || null,
        triggers: data.triggers ?? [],
        content: data.content ?? "",
        word_count: wc,
        ai_assisted: data.ai_assisted ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id)
      .select("*")
      .single();

    if (error || !updated) {
      onError(error?.message ?? "Failed to save draft.");
      return;
    }

    onSave(updated as DraftStory);
  }

  return (
    <div className="rounded-xl border-2 border-purple-300 bg-white p-6">
      <form onSubmit={handleSubmit(onSubmitDraft)} className="space-y-5">
        {/* Title */}
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            {...register("title")}
            className={inputClass}
            placeholder="Story title"
            maxLength={STORY_LIMITS.titleMaxLength}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* Hook */}
        <div>
          <label className={labelClass}>Hook</label>
          <textarea
            rows={2}
            {...register("hook")}
            className={inputClass + " resize-none"}
            placeholder="A compelling one-liner..."
            maxLength={STORY_LIMITS.hookMaxLength}
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            {errors.hook ? (
              <p className="text-red-500">{errors.hook.message}</p>
            ) : (
              <span />
            )}
            <span>
              {hookValue.length}/{STORY_LIMITS.hookMaxLength}
            </span>
          </div>
        </div>

        {/* Genre (multi-select, max 3) */}
        <div>
          <label className={labelClass}>
            Genre{" "}
            <span className="text-slate-400 font-normal">
              (up to {MAX_GENRES_PER_STORY})
            </span>
          </label>
          <Controller
            name="genre"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 mt-1">
                {GENRES.map((g) => {
                  const selected = field.value?.includes(g);
                  const atMax =
                    (field.value?.length ?? 0) >= MAX_GENRES_PER_STORY && !selected;
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={atMax}
                      onClick={() => {
                        const current = field.value ?? [];
                        field.onChange(
                          selected
                            ? current.filter((x) => x !== g)
                            : [...current, g]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-purple-100 border-purple-400 text-purple-700"
                          : atMax
                            ? "border-slate-100 text-slate-300 cursor-not-allowed"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.genre && (
            <p className="mt-1 text-sm text-red-500">{errors.genre.message}</p>
          )}
        </div>

        {/* Mood */}
        <div>
          <label className={labelClass}>
            Mood <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select {...register("mood")} className={inputClass}>
            <option value="">None</option>
            {MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Warnings */}
        <div>
          <label className={labelClass}>
            Trigger Warnings{" "}
            <span className="text-slate-400 font-normal">(select all that apply)</span>
          </label>
          <Controller
            name="triggers"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 mt-1">
                {TRIGGER_WARNINGS.map((tw) => {
                  const selected = field.value?.includes(tw);
                  return (
                    <button
                      key={tw}
                      type="button"
                      onClick={() => {
                        const current = field.value ?? [];
                        field.onChange(
                          selected
                            ? current.filter((t) => t !== tw)
                            : [...current, tw]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-red-50 border-red-300 text-red-600"
                          : "border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {tw}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        {/* Content */}
        <div>
          <label className={labelClass}>Story Content</label>
          <textarea
            rows={14}
            {...register("content")}
            className={inputClass + " resize-y font-mono text-sm leading-relaxed"}
            placeholder="Write your story here..."
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            {errors.content ? (
              <p className="text-red-500">{errors.content.message}</p>
            ) : (
              <span />
            )}
            <span
              className={
                wordCount < STORY_LIMITS.minWords
                  ? "text-amber-500"
                  : wordCount > STORY_LIMITS.maxWords
                    ? "text-red-500"
                    : "text-green-500"
              }
            >
              {wordCount.toLocaleString()} words
            </span>
          </div>
        </div>

        {/* AI-Assisted */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <input
            id={`ai-${draft.id}`}
            type="checkbox"
            {...register("ai_assisted")}
            className="mt-0.5 accent-amber-600 w-4 h-4"
          />
          <label htmlFor={`ai-${draft.id}`} className="text-sm text-slate-700 cursor-pointer">
            <span className="font-semibold text-amber-700">AI-Assisted</span>
            <span className="block mt-0.5 text-xs text-slate-500">
              Check if AI tools were used in writing this story.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/* ====================================================================
   TAB: Submit (4-step flow)
   ==================================================================== */

function SubmitTab({
  user,
  popcycle,
  supabase,
}: {
  user: UserProfile | null;
  popcycle: Popcycle | null;
  supabase: ReturnType<typeof createClient>;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);

  // Step data
  const [drafts, setDrafts] = useState<DraftStory[]>([]);
  const [publishedStories, setPublishedStories] = useState<DraftStory[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [predecessorId, setPredecessorId] = useState<string | null>(null);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  const isOpen =
    popcycle &&
    popcycle.status === "submissions_open" &&
    new Date(popcycle.submissions_close_at) > new Date();

  const hasCredits = (user?.entry_credits ?? 0) > 0;
  const selectedDraft = drafts.find((d) => d.id === selectedDraftId) ?? null;

  // Load eligible drafts
  useEffect(() => {
    async function load() {
      if (!user) return;

      const [{ data: draftData }, { data: pubData }] = await Promise.all([
        supabase
          .from("stories")
          .select("*")
          .eq("author_id", user.id)
          .is("popcycle_id", null)
          .eq("status", "draft")
          .order("updated_at", { ascending: false }),
        supabase
          .from("stories")
          .select("*")
          .eq("author_id", user.id)
          .not("popcycle_id", "is", null)
          .in("status", ["published", "approved", "pending_review"])
          .order("created_at", { ascending: false }),
      ]);

      setDrafts((draftData as DraftStory[]) ?? []);
      setPublishedStories((pubData as DraftStory[]) ?? []);
      setLoadingDrafts(false);
    }
    load();
  }, [user, supabase]);

  // Check if a draft is complete enough to submit
  function isDraftComplete(d: DraftStory): boolean {
    const wc = d.word_count ?? 0;
    return wc >= 1000 && !!d.hook && (d.genre?.length ?? 0) >= 1;
  }

  // Handle final submission
  async function handleConfirmSubmit() {
    setSubmitError(null);

    if (!selectedDraft || !popcycle || !selectedPrompt) return;

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setSubmitError("You must be logged in to submit.");
        return;
      }

      // Check existing submission
      const { data: existing } = await supabase
        .from("stories")
        .select("id")
        .eq("author_id", authUser.id)
        .eq("popcycle_id", popcycle.id)
        .not("status", "eq", "rejected")
        .maybeSingle();

      if (existing) {
        setSubmitError("You already have a submission for this popcycle.");
        return;
      }

      // Split content into sections
      const content = selectedDraft.content ?? "";
      const sections = splitIntoSections(content, 5);
      const wc = countWords(content);

      // Update story with popcycle_id and sections
      const { error: updateError } = await supabase
        .from("stories")
        .update({
          popcycle_id: popcycle.id,
          predecessor_id: predecessorId,
          section_1: sections[0] ?? "",
          section_2: sections[1] ?? "",
          section_3: sections[2] ?? "",
          section_4: sections[3] ?? "",
          section_5: sections[4] ?? "",
          word_count: wc,
          status: "draft",
        })
        .eq("id", selectedDraft.id);

      if (updateError) {
        setSubmitError(updateError.message);
        return;
      }

      // Payment path
      if (hasCredits) {
        const { error: creditError } = await supabase
          .from("users")
          .update({ entry_credits: (user?.entry_credits ?? 1) - 1 })
          .eq("id", authUser.id);

        if (creditError) {
          setSubmitError("Failed to deduct entry credit. Please try again.");
          return;
        }

        await supabase
          .from("stories")
          .update({ status: "pending_review" })
          .eq("id", selectedDraft.id);

        setSubmitSuccess(true);
      } else {
        setPaymentPending(true);

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            popcycle_id: popcycle.id,
            story_id: selectedDraft.id,
          }),
        });

        const result = await res.json();
        if (!res.ok || !result.url) {
          setSubmitError(result.error ?? "Failed to start payment. Please try again.");
          setPaymentPending(false);
          return;
        }

        window.location.href = result.url;
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  if (!isOpen) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16 rounded-xl border border-slate-200 bg-white">
          <div className="text-4xl mb-4">&#9997;&#65039;</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            No Active Submissions
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {popcycle
              ? `The current popcycle "${popcycle.title}" is in the ${popcycle.status.replace(/_/g, " ")} phase. Check back when submissions open.`
              : "There is no active popcycle right now. Check back soon!"}
          </p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16 rounded-xl border border-green-200 bg-green-50">
          <div className="text-5xl mb-4">&#127881;</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Story Submitted!</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your story is now under review. You&apos;ll be notified once it&apos;s approved and published.
          </p>
        </div>
      </div>
    );
  }

  // Step indicator
  const steps = [
    { num: 1, label: "Pick Draft" },
    { num: 2, label: "Pick Prompt" },
    { num: 3, label: "Link Sequel" },
    { num: 4, label: "Confirm" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
          Submit Your Story
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Popcycle: {popcycle.title} &middot; Closes{" "}
          {new Date(popcycle.submissions_close_at).toLocaleDateString()}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s.num
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                step >= s.num ? "text-purple-600" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 rounded-full ${
                  step > s.num ? "bg-purple-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {submitError}
        </div>
      )}

      {/* Step 1: Pick a draft */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Step 1: Pick a Draft
          </h2>
          <p className="text-sm text-slate-500">
            Choose a complete draft to submit. It must have content (at least 1,000 words), a hook, and at least one genre.
          </p>

          {loadingDrafts ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-slate-200 bg-white">
              <p className="text-slate-400">
                No drafts found. Go to the My Stories tab to create one.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((d) => {
                const complete = isDraftComplete(d);
                const isSelected = selectedDraftId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!complete}
                    onClick={() => setSelectedDraftId(d.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? "border-purple-400 bg-purple-50"
                        : complete
                          ? "border-slate-200 bg-white hover:border-slate-300"
                          : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 truncate">
                          {d.title || "Untitled"}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {d.genre.map((g) => (
                            <span
                              key={g}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {d.word_count.toLocaleString()} words
                          {!d.hook && " \u00b7 Missing hook"}
                          {(d.genre?.length ?? 0) === 0 && " \u00b7 Missing genre"}
                          {d.word_count < 1000 && " \u00b7 Below 1,000 words"}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-purple-600 font-bold text-lg">&#10003;</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <button
              disabled={!selectedDraftId}
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Pick Prompt
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Pick a Popcycle prompt */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Step 2: Pick a Prompt
          </h2>
          <p className="text-sm text-slate-500">{popcycle.prompt_theme}</p>

          <div className="space-y-2">
            {([
              { key: "prompt_1", value: popcycle.prompt_1 },
              { key: "prompt_2", value: popcycle.prompt_2 },
              { key: "prompt_3", value: popcycle.prompt_3 },
              { key: "prompt_4", value: popcycle.prompt_4 },
              { key: "prompt_5", value: popcycle.prompt_5 },
            ] as const)
              .filter((p) => p.value)
              .map((p, i) => (
                <label
                  key={p.key}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    selectedPrompt === p.key
                      ? "border-purple-400 bg-purple-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="selected_prompt"
                    value={p.key}
                    checked={selectedPrompt === p.key}
                    onChange={() => setSelectedPrompt(p.key)}
                    className="mt-0.5 accent-purple-600"
                  />
                  <span className="text-sm text-slate-700">
                    <span className="font-medium text-slate-500 mr-1">{i + 1}.</span>
                    {p.value}
                  </span>
                </label>
              ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              disabled={!selectedPrompt}
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Link Sequel
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Link as sequel (optional) */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Step 3: Link as Sequel{" "}
            <span className="text-slate-400 font-normal text-sm">(optional)</span>
          </h2>
          <p className="text-sm text-slate-500">
            If this story is a sequel, link it to the predecessor.
          </p>

          <select
            value={predecessorId ?? ""}
            onChange={(e) => setPredecessorId(e.target.value || null)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
          >
            <option value="">Standalone (no predecessor)</option>
            {publishedStories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
            >
              Next: Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm & pay */}
      {step === 4 && selectedDraft && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Step 4: Confirm &amp; Pay
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Story</span>
              <span className="text-sm font-bold text-slate-800">
                {selectedDraft.title}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Genre</span>
              <span className="text-sm text-slate-800">
                {selectedDraft.genre.join(", ")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Word Count</span>
              <span className="text-sm text-slate-800">
                {selectedDraft.word_count.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Prompt</span>
              <span className="text-sm text-slate-800">
                {selectedPrompt.replace("_", " ")}
              </span>
            </div>
            {predecessorId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Sequel to</span>
                <span className="text-sm text-slate-800">
                  {publishedStories.find((s) => s.id === predecessorId)?.title ?? "Unknown"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">AI-Assisted</span>
              <span className="text-sm text-slate-800">
                {selectedDraft.ai_assisted ? "Yes" : "No"}
              </span>
            </div>
            <hr className="border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Payment</span>
              <span className="text-sm font-bold text-purple-600">
                {hasCredits
                  ? "1 Entry Credit"
                  : formatCents(ENTRY_FEE_CENTS)}
              </span>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirmSubmit}
              disabled={paymentPending}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold text-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentPending
                ? "Redirecting to payment..."
                : hasCredits
                  ? "Use Entry Credit to Submit"
                  : `Pay ${formatCents(ENTRY_FEE_CENTS)} to Submit`}
            </button>
          </div>
          <p className="text-center text-xs text-slate-400">
            Your story will be reviewed before publishing. Payment is non-refundable.
          </p>
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   TAB: Popoff
   ==================================================================== */

function PopoffTab({
  popcycle,
  popoffStories,
  userRank,
}: {
  popcycle: Popcycle | null;
  popoffStories: PopoffStory[];
  userRank: number | null;
}) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!popcycle) return;
    function tick() {
      if (!popcycle) return;
      setCountdown(formatCountdown(popcycle.popoff_at));
    }
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [popcycle]);

  if (!popcycle) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 rounded-xl border border-slate-200 bg-white">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          No Popoff Scheduled
        </h2>
        <p className="text-sm text-slate-400">
          Check back when a Popcycle is active.
        </p>
      </div>
    );
  }

  const isPopoff =
    popcycle.status === "popoff" || popcycle.status === "completed";
  const isPast = new Date(popcycle.popoff_at) <= new Date();
  const showResults = isPopoff || isPast;

  const podiumColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const podiumLabels = ["1st", "2nd", "3rd"];
  const prizePool = popcycle.prize_pool_cents;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
          {popcycle.title}{" "}
          <span className="text-purple-600">Popoff</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">{popcycle.prompt_theme}</p>
      </div>

      {/* Countdown or Results */}
      {!showResults ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Popoff In</h2>
          <p className="text-4xl font-extrabold text-purple-600 tabular-nums">
            {countdown}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Refresh for updated countdown.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 text-center">
            Results
          </h2>
          {popoffStories.length === 0 ? (
            <p className="text-center text-slate-400">
              Results are being calculated...
            </p>
          ) : (
            <div className="flex justify-center gap-6">
              {popoffStories.map((story, i) => (
                <div key={i} className="text-center">
                  <div
                    className={`text-3xl font-extrabold ${podiumColors[i]}`}
                  >
                    {podiumLabels[i]}
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800 truncate max-w-[140px]">
                    {story.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    by @{story.penName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-purple-600">
                    {story.displayScore.toFixed(1)} pts
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* User ranking */}
          {userRank !== null && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Your finish:{" "}
                <span className="font-bold text-slate-800">#{userRank}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prize breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Prize Pool</h2>
        <div className="text-center mb-4">
          <span className="text-3xl font-extrabold text-purple-600">
            {formatCents(prizePool)}
          </span>
        </div>
        <div className="space-y-3">
          {[
            { label: "1st Place", pct: PRIZE_DISTRIBUTION.firstPct, color: "text-yellow-500" },
            { label: "2nd Place", pct: PRIZE_DISTRIBUTION.secondPct, color: "text-slate-400" },
            { label: "3rd Place", pct: PRIZE_DISTRIBUTION.thirdPct, color: "text-amber-600" },
            { label: "House", pct: PRIZE_DISTRIBUTION.housePct, color: "text-slate-400" },
          ].map(({ label, pct, color }) => (
            <div
              key={label}
              className="flex items-center justify-between text-sm"
            >
              <span className={`font-semibold ${color}`}>{label}</span>
              <span className="text-slate-400">
                {pct}% &middot; {formatCents(Math.floor((prizePool * pct) / 100))}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-400">4th-10th Place</span>
            <span className="text-slate-400">1 free entry credit each</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================
   TAB: Billing
   ==================================================================== */

function BillingTab({ user }: { user: UserProfile | null }) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
        Billing
      </h1>

      {/* Current status */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Subscription Status
        </h2>
        <p className="text-sm text-slate-500">
          No active subscription. Subscribe to get entry credits and perks.
        </p>
      </div>

      {/* Plans */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Monthly */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {SUBSCRIPTION_TIERS.monthly.name}
            </h3>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">
              {formatCents(SUBSCRIPTION_TIERS.monthly.priceCents)}
              <span className="text-sm font-normal text-slate-400">/mo</span>
            </p>
          </div>
          <ul className="space-y-2">
            {SUBSCRIPTION_TIERS.monthly.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
          <button className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors">
            Subscribe Monthly
          </button>
        </div>

        {/* Annual */}
        <div className="rounded-xl border-2 border-purple-300 bg-white p-6 space-y-4 relative">
          <div className="absolute -top-3 left-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-600 text-white">
              Best Value
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {SUBSCRIPTION_TIERS.annual.name}
            </h3>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">
              {formatCents(SUBSCRIPTION_TIERS.annual.priceCents)}
              <span className="text-sm font-normal text-slate-400">/yr</span>
            </p>
          </div>
          <ul className="space-y-2">
            {SUBSCRIPTION_TIERS.annual.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
          <button className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors">
            Subscribe Annual
          </button>
        </div>
      </div>

      {/* Payment history */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Payment History
        </h2>
        <p className="text-sm text-slate-400">No payments yet.</p>
      </div>

      {/* Stripe portal */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Manage Subscription
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Access Stripe Customer Portal to manage your subscription, payment
          methods, and invoices.
        </p>
        <button className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Open Customer Portal
        </button>
      </div>
    </div>
  );
}

/* ====================================================================
   TAB: Entry Credits
   ==================================================================== */

function CreditsTab({ user }: { user: UserProfile | null }) {
  const credits = user?.entry_credits ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
        Entry Credits
      </h1>

      {/* Balance */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Current Balance
        </p>
        <p className="mt-1 text-4xl font-extrabold text-purple-600">
          {credits}
        </p>
        <p className="mt-1 text-sm text-slate-400">entry credits</p>
      </div>

      {/* How credits work */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">
          How Credits Work
        </h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5 font-bold">&bull;</span>
            Each entry credit lets you submit one story to a Popcycle (normally{" "}
            {formatCents(ENTRY_FEE_CENTS)}).
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5 font-bold">&bull;</span>
            Monthly subscribers get 5 credits/month. Unused credits roll over
            each month.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5 font-bold">&bull;</span>
            Annual subscribers get 65 credits upfront (a full year of entries
            plus 5 bonus).
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5 font-bold">&bull;</span>
            You can also earn credits by finishing 4th-10th in a Popoff.
          </li>
        </ul>
      </div>

      {/* Purchase options */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          Get More Credits
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Single */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-3">
            <p className="text-sm font-bold text-slate-800">Single Entry</p>
            <p className="text-2xl font-extrabold text-purple-600">
              {formatCents(ENTRY_FEE_CENTS)}
            </p>
            <p className="text-xs text-slate-400">1 credit</p>
            <button className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors">
              Buy
            </button>
          </div>

          {/* Monthly */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-3">
            <p className="text-sm font-bold text-slate-800">Monthly Sub</p>
            <p className="text-2xl font-extrabold text-purple-600">
              {formatCents(SUBSCRIPTION_TIERS.monthly.priceCents)}
              <span className="text-xs font-normal text-slate-400">/mo</span>
            </p>
            <p className="text-xs text-slate-400">
              5 credits/mo (rollover)
            </p>
            <button className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors">
              Subscribe
            </button>
          </div>

          {/* Annual */}
          <div className="rounded-xl border-2 border-purple-300 bg-white p-5 text-center space-y-3 relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-600 text-white">
                Best Deal
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800">Annual Sub</p>
            <p className="text-2xl font-extrabold text-purple-600">
              {formatCents(SUBSCRIPTION_TIERS.annual.priceCents)}
              <span className="text-xs font-normal text-slate-400">/yr</span>
            </p>
            <p className="text-xs text-slate-400">65 credits upfront</p>
            <button className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Credit history */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Credit History
        </h2>
        <p className="text-sm text-slate-400">No credit transactions yet.</p>
      </div>
    </div>
  );
}

/* ====================================================================
   TAB: Settings
   ==================================================================== */

function SettingsTab({
  user,
  supabase,
}: {
  user: UserProfile | null;
  supabase: ReturnType<typeof createClient>;
}) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [penNameEdit, setPenNameEdit] = useState(false);
  const [newPenName, setNewPenName] = useState(user?.pen_name ?? "");
  const [penNameError, setPenNameError] = useState<string | null>(null);
  const [penNameSaving, setPenNameSaving] = useState(false);

  const canChangePenName = (() => {
    if (!user?.pen_name_changed_at) return true;
    const lastChanged = new Date(user.pen_name_changed_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return lastChanged < sevenDaysAgo;
  })();

  const daysUntilChange = (() => {
    if (!user?.pen_name_changed_at) return 0;
    const lastChanged = new Date(user.pen_name_changed_at);
    const nextAllowed = new Date(lastChanged.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diff = nextAllowed.getTime() - Date.now();
    return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
  })();

  async function handlePenNameChange() {
    setPenNameError(null);
    const trimmed = newPenName.trim();

    if (!trimmed || trimmed.length < 3) {
      setPenNameError("Pen name must be at least 3 characters.");
      return;
    }
    if (trimmed.length > 30) {
      setPenNameError("Pen name must be at most 30 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setPenNameError("Letters, numbers, hyphens, and underscores only.");
      return;
    }
    if (trimmed === user?.pen_name) {
      setPenNameEdit(false);
      return;
    }

    setPenNameSaving(true);

    // Check uniqueness
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("pen_name", trimmed)
      .neq("id", user?.id ?? "")
      .limit(1);

    if (existing && existing.length > 0) {
      setPenNameError("That pen name is already taken.");
      setPenNameSaving(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ pen_name: trimmed, pen_name_changed_at: new Date().toISOString() })
      .eq("id", user?.id ?? "");

    if (error) {
      setPenNameError(error.message);
    } else {
      setSuccessMsg("Pen name updated!");
      setPenNameEdit(false);
    }
    setPenNameSaving(false);
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      real_name: user?.real_name ?? "",
      bio: user?.bio ?? "",
      avatar_url: user?.avatar_url ?? "",
    },
  });

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
  const errorTextClass = "mt-1 text-sm text-red-500";

  async function onUpdateProfile(data: ProfileUpdateInput) {
    setServerError(null);
    setSuccessMsg(null);

    if (!user) {
      setServerError("Not authenticated");
      return;
    }

    const updates: Record<string, string> = {};
    if (data.real_name) updates.real_name = data.real_name;
    if (data.bio !== undefined) updates.bio = data.bio ?? "";
    if (data.avatar_url) updates.avatar_url = data.avatar_url;

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      setServerError(error.message);
    } else {
      setSuccessMsg("Profile updated successfully.");
    }
  }

  async function handleChangePassword() {
    setServerError(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(
      user?.email ?? "",
      { redirectTo: `${window.location.origin}/auth/reset-password` }
    );

    if (error) {
      setServerError(error.message);
    } else {
      setSuccessMsg("Password reset email sent. Check your inbox.");
    }
  }

  async function handleExportData() {
    setExportLoading(true);
    setServerError(null);

    try {
      if (!user) throw new Error("Not authenticated");

      const [
        { data: profile },
        { data: stories },
        { data: pops },
        { data: comments },
        { data: follows },
      ] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase.from("stories").select("*").eq("author_id", user.id),
        supabase.from("pops").select("*").eq("reader_id", user.id),
        supabase.from("comments").select("*").eq("user_id", user.id),
        supabase.from("follows").select("*").eq("follower_id", user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile,
        stories,
        reading_history: pops,
        comments,
        follows,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poplit-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Export failed"
      );
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setServerError(null);
    await handleExportData();

    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({
        pen_name: `deleted_${user.id.slice(0, 8)}`,
        real_name: "Deleted User",
        bio: null,
        avatar_url: null,
        email: `deleted_${user.id}@poplit.local`,
      })
      .eq("id", user.id);

    if (error) {
      setServerError(error.message);
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
        Settings
      </h1>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-600">
          {successMsg}
        </div>
      )}
      {serverError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {serverError}
        </div>
      )}

      {/* Profile */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Profile</h2>
        <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
          <div>
            <label className={labelClass}>Pen Name</label>
            {penNameEdit ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newPenName}
                  onChange={(e) => setNewPenName(e.target.value)}
                  maxLength={30}
                  className={inputClass + " font-mono"}
                  placeholder="new-pen-name"
                />
                {penNameError && (
                  <p className="text-sm text-red-500">{penNameError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePenNameChange}
                    disabled={penNameSaving}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {penNameSaving ? "Checking..." : "Save Pen Name"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPenNameEdit(false); setPenNameError(null); setNewPenName(user?.pen_name ?? ""); }}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={user?.pen_name ?? ""}
                  disabled
                  className={inputClass + " opacity-60 cursor-not-allowed flex-1"}
                />
                {canChangePenName ? (
                  <button
                    type="button"
                    onClick={() => setPenNameEdit(true)}
                    className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    Change
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">
                    {daysUntilChange}d until next change
                  </span>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Can be changed once every 7 days. Letters, numbers, hyphens, underscores only.
            </p>
          </div>

          <div>
            <label htmlFor="s-real-name" className={labelClass}>
              Real Name
            </label>
            <input
              id="s-real-name"
              type="text"
              {...register("real_name")}
              className={inputClass}
              placeholder="Your real name"
            />
            <p className="mt-1 text-xs text-slate-400">
              Used for payment and authorship verification. Not shown publicly.
            </p>
            {errors.real_name && (
              <p className={errorTextClass}>{errors.real_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="s-bio" className={labelClass}>
              Bio
            </label>
            <textarea
              id="s-bio"
              rows={3}
              {...register("bio")}
              className={inputClass + " resize-none"}
              placeholder="Tell readers about yourself..."
            />
            {errors.bio && (
              <p className={errorTextClass}>{errors.bio.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="s-avatar" className={labelClass}>
              Avatar URL
            </label>
            <input
              id="s-avatar"
              type="url"
              {...register("avatar_url")}
              className={inputClass}
              placeholder="https://..."
            />
            {errors.avatar_url && (
              <p className={errorTextClass}>{errors.avatar_url.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Invite Friends */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Invite Friends</h2>
        <p className="text-sm text-slate-500 mb-4">
          Share your invite code — you and your friend each get a free entry credit when they sign up!
        </p>

        {/* Code display */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-slate-800">
            {user?.invite_code ?? "------"}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(user?.invite_code ?? "");
              setSuccessMsg("Invite code copied!");
            }}
            className="shrink-0 px-4 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: "Text",
              action: () => {
                const url = `https://poplit.io/auth/signup?ref=${user?.invite_code}`;
                window.open(`sms:?body=${encodeURIComponent(`Join me on PopLit! Use my invite code ${user?.invite_code} to get a free entry credit. ${url}`)}`, "_blank");
              },
              color: "bg-green-500 hover:bg-green-600",
            },
            {
              label: "Email",
              action: () => {
                const url = `https://poplit.io/auth/signup?ref=${user?.invite_code}`;
                window.open(`mailto:?subject=${encodeURIComponent("Join me on PopLit!")}&body=${encodeURIComponent(`Hey! I've been using PopLit for weekly short story contests and I think you'd love it. Use my invite code ${user?.invite_code} to sign up and we both get a free entry credit!\n\n${url}`)}`, "_blank");
              },
              color: "bg-blue-500 hover:bg-blue-600",
            },
            {
              label: "X / Twitter",
              action: () => {
                const url = `https://poplit.io/auth/signup?ref=${user?.invite_code}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me on PopLit — weekly short story contests where readers pick the winner! Use code ${user?.invite_code} for a free entry credit 🫧`)} ${url}`, "_blank");
              },
              color: "bg-slate-800 hover:bg-slate-900",
            },
            {
              label: "Copy Link",
              action: () => {
                navigator.clipboard.writeText(`https://poplit.io/auth/signup?ref=${user?.invite_code}`);
                setSuccessMsg("Invite link copied!");
              },
              color: "bg-orange-500 hover:bg-orange-600",
            },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.action}
              className={`px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </section>

      {/* Account actions */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Account</h2>

        <button
          type="button"
          onClick={handleChangePassword}
          className="w-full py-3 rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Change Password
        </button>

        <button
          type="button"
          onClick={handleExportData}
          disabled={exportLoading}
          className="w-full py-3 rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {exportLoading ? "Exporting..." : "Export My Data (GDPR)"}
        </button>

        <div className="pt-4 border-t border-slate-100">
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                This will anonymize your account data and sign you out. Your
                stories will remain but be attributed to &quot;Deleted
                User&quot;. A data export will be downloaded automatically.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ====================================================================
   TAB: Garden
   ==================================================================== */

interface GardenStory {
  id: string;
  story_id: string;
  created_at: string;
  stories: {
    id: string;
    title: string;
    hook: string | null;
    genre: string[];
    created_at: string;
    users: {
      pen_name: string;
    } | null;
  } | null;
}

function GardenTab({
  supabase,
  setMode,
}: {
  supabase: ReturnType<typeof createClient>;
  setMode: (mode: "reading" | "writing") => void;
}) {
  const [gardenItems, setGardenItems] = useState<GardenStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("poppy_gardens")
        .select("id, story_id, created_at, stories(id, title, hook, genre, created_at, users!author_id(pen_name))")
        .eq("reader_id", user.id)
        .order("created_at", { ascending: false });

      setGardenItems((data as unknown as GardenStory[]) ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleRemove(gardenId: string) {
    setRemovingId(gardenId);
    const { error } = await supabase.from("poppy_gardens").delete().eq("id", gardenId);
    if (!error) {
      setGardenItems((prev) => prev.filter((g) => g.id !== gardenId));
    }
    setRemovingId(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
          Your Garden
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Stories you&apos;ve saved to revisit.
        </p>
      </div>

      {gardenItems.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-slate-200 bg-white">
          <div className="text-4xl mb-4">&#127803;</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Your garden is empty.
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            When you find a story you love while reading, add it to your garden to revisit it later.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {gardenItems.map((item) => {
            const story = item.stories;
            if (!story) return null;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-green-300 transition-colors"
              >
                <h3 className="text-base font-bold text-slate-800 truncate">
                  {story.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  by @{story.users?.pen_name ?? "unknown"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {story.genre.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setMode("reading")}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                  >
                    Read Again
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {removingId === item.id ? "Removing..." : "Remove from Garden"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   Shared: StatusBadge
   ==================================================================== */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-green-50 text-green-600 border-green-200",
    draft: "bg-slate-50 text-slate-500 border-slate-200",
    pending_review: "bg-yellow-50 text-yellow-600 border-yellow-200",
    ai_flagged: "bg-red-50 text-red-600 border-red-200",
    approved: "bg-blue-50 text-blue-600 border-blue-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
    archived: "bg-slate-50 text-slate-400 border-slate-200",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] ?? styles.draft}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
