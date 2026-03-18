"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { useModeStore } from "@/stores/mode";
import {
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
} from "@poplit/core/constants";
import { countWords, formatCents, formatCountdown, splitIntoSections } from "@poplit/core/utils";

/* ---------- types ---------- */

type Tab = "overview" | "submit" | "popoff" | "billing" | "credits" | "settings";

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
  genre: string;
  created_at: string;
  display_score: number;
  total_readers: number;
  completion_rate: number;
  rank: number | null;
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
        setStories(
          storyData.map((s: any) => {
            const score = s.scores?.[0] ?? null;
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
    { key: "submit", label: "Submit" },
    { key: "popoff", label: "Popoff" },
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
                      {story.genre} &middot;{" "}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ====================================================================
   TAB: Submit
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
  const [preview, setPreview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);

  const isOpen =
    popcycle &&
    popcycle.status === "submissions_open" &&
    new Date(popcycle.submissions_close_at) > new Date();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StorySubmissionInput>({
    resolver: zodResolver(storySubmissionSchema),
    defaultValues: {
      triggers: [],
      popcycle_id: popcycle?.id ?? "",
    },
  });

  const hookValue = watch("hook") ?? "";
  const contentValue = watch("content") ?? "";
  const wordCount = contentValue ? countWords(contentValue) : 0;
  const hasCredits = (user?.entry_credits ?? 0) > 0;

  async function onSubmit(data: StorySubmissionInput) {
    setSubmitError(null);

    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setSubmitError("You must be logged in to submit.");
        return;
      }

      // Check if user already submitted to this popcycle
      const { data: existing } = await supabase
        .from("stories")
        .select("id")
        .eq("author_id", authUser.id)
        .eq("popcycle_id", data.popcycle_id)
        .not("status", "eq", "rejected")
        .maybeSingle();

      if (existing) {
        setSubmitError("You already have a submission for this popcycle.");
        return;
      }

      // Split content into 5 sections
      const sections = splitIntoSections(data.content, 5);

      // Insert story as draft first
      const { data: story, error: insertError } = await supabase
        .from("stories")
        .insert({
          author_id: authUser.id,
          popcycle_id: data.popcycle_id,
          title: data.title,
          hook: data.hook,
          genre: data.genre,
          mood: data.mood ?? null,
          triggers: data.triggers ?? [],
          section_1: sections[0] ?? "",
          section_2: sections[1] ?? "",
          section_3: sections[2] ?? "",
          section_4: sections[3] ?? "",
          section_5: sections[4] ?? "",
          word_count: countWords(data.content),
          status: "draft",
          ai_assisted: data.ai_assisted ?? false,
        })
        .select("id")
        .single();

      if (insertError || !story) {
        setSubmitError(insertError?.message ?? "Failed to save story.");
        return;
      }

      // --- Payment path ---
      if (hasCredits) {
        // Deduct 1 entry credit
        const { error: creditError } = await supabase
          .from("users")
          .update({ entry_credits: (user?.entry_credits ?? 1) - 1 })
          .eq("id", authUser.id);

        if (creditError) {
          setSubmitError("Failed to deduct entry credit. Please try again.");
          return;
        }

        // Move story to pending_review
        await supabase
          .from("stories")
          .update({ status: "pending_review" })
          .eq("id", story.id);

        setSubmitSuccess(true);
      } else {
        // Stripe Checkout redirect flow
        setPaymentPending(true);

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            popcycle_id: data.popcycle_id,
            story_id: story.id,
          }),
        });

        const result = await res.json();
        if (!res.ok || !result.url) {
          setSubmitError(result.error ?? "Failed to start payment. Please try again.");
          setPaymentPending(false);
          return;
        }

        // Redirect to Stripe Checkout — webhook will update story to pending_review on success
        window.location.href = result.url;
        return;
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
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Story Submitted!</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your story is now under review. You&apos;ll be notified once it&apos;s approved and published.
          </p>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
  const errorClass = "mt-1 text-sm text-red-500";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
            Submit Your Story
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Popcycle: {popcycle.title} &middot; Closes{" "}
            {new Date(popcycle.submissions_close_at).toLocaleDateString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {submitError}
        </div>
      )}

      {preview ? (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {watch("title") || "Untitled"}
            </h2>
            <p className="mt-2 text-slate-500 italic">
              {hookValue || "No hook yet..."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {watch("genre") && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500 text-white">
                {watch("genre")}
              </span>
            )}
            {watch("mood") && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200 text-slate-600">
                {watch("mood")}
              </span>
            )}
            {(watch("triggers") ?? []).map((tw: string) => (
              <span
                key={tw}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600"
              >
                {tw}
              </span>
            ))}
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
            {contentValue || "Start writing to see a preview..."}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Prompt Selection */}
          <div>
            <label className={labelClass}>
              Choose a Prompt
            </label>
            <p className="text-xs text-slate-400 mb-2">{popcycle.prompt_theme}</p>
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
            {!selectedPrompt && (
              <p className="mt-1 text-sm text-amber-500">Please select a prompt before submitting.</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="w-title" className={labelClass}>
              Title
            </label>
            <input
              id="w-title"
              type="text"
              {...register("title")}
              className={inputClass}
              placeholder="Your story title"
              maxLength={STORY_LIMITS.titleMaxLength}
            />
            {errors.title && <p className={errorClass}>{errors.title.message}</p>}
          </div>

          {/* Hook */}
          <div>
            <label htmlFor="w-hook" className={labelClass}>
              Hook
            </label>
            <textarea
              id="w-hook"
              rows={3}
              {...register("hook")}
              className={inputClass + " resize-none"}
              placeholder="A compelling one-liner to draw readers in..."
              maxLength={STORY_LIMITS.hookMaxLength}
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              {errors.hook ? (
                <p className="text-red-500">{errors.hook.message}</p>
              ) : (
                <span />
              )}
              <span
                className={
                  hookValue.length > STORY_LIMITS.hookMaxLength * 0.9
                    ? "text-red-500"
                    : ""
                }
              >
                {hookValue.length}/{STORY_LIMITS.hookMaxLength}
              </span>
            </div>
          </div>

          {/* Genre */}
          <div>
            <label htmlFor="w-genre" className={labelClass}>
              Genre
            </label>
            <select id="w-genre" {...register("genre")} className={inputClass}>
              <option value="">Select a genre</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errors.genre && <p className={errorClass}>{errors.genre.message}</p>}
          </div>

          {/* Mood */}
          <div>
            <label htmlFor="w-mood" className={labelClass}>
              Mood{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select id="w-mood" {...register("mood")} className={inputClass}>
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
              <span className="text-slate-400 font-normal">
                (select all that apply)
              </span>
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
            <label htmlFor="w-content" className={labelClass}>
              Story Content
            </label>
            <textarea
              id="w-content"
              rows={16}
              {...register("content")}
              className={
                inputClass + " resize-y font-mono text-sm leading-relaxed"
              }
              placeholder="Write your story here... It will be automatically split into 5 sections for readers."
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
                {wordCount.toLocaleString()} /{" "}
                {STORY_LIMITS.minWords.toLocaleString()}-
                {STORY_LIMITS.maxWords.toLocaleString()} words
              </span>
            </div>
          </div>

          <input type="hidden" {...register("popcycle_id")} />

          {/* AI-Assisted Disclosure */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <input
              id="w-ai-assisted"
              type="checkbox"
              {...register("ai_assisted")}
              className="mt-0.5 accent-amber-600 w-4 h-4"
            />
            <label htmlFor="w-ai-assisted" className="text-sm text-slate-700 cursor-pointer">
              <span className="font-semibold text-amber-700">AI-Assisted</span>
              <span className="block mt-0.5 text-xs text-slate-500">
                Check this if AI tools were used in writing this story. Self-disclosure carries no scoring penalty — honesty is rewarded. Stories detected as AI-generated without disclosure will have prior pops halved.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || paymentPending || !selectedPrompt}
            className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-semibold text-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paymentPending
              ? "Redirecting to payment..."
              : isSubmitting
                ? "Submitting..."
                : hasCredits
                  ? "Use Entry Credit to Submit"
                  : `Pay ${formatCents(ENTRY_FEE_CENTS)} to Submit`}
          </button>
          <p className="text-center text-xs text-slate-400">
            Your story will be reviewed before publishing. Payment is
            non-refundable.
          </p>
        </form>
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
