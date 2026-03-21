"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { StoryBubbleCanvas, type StoryBubbleData } from "@/components/ui/story-bubble";
import { SectionPopBarrier } from "@/components/ui/section-pop-barrier";
import { useModeStore } from "@/stores/mode";
import { MIN_READ_TIME_MS, ENDING_SURVEY_QUESTIONS, EXIT_SURVEY_REASONS, REACTION_TYPES } from "@poplit/core/constants";
import { colors } from "@poplit/ui";

const genreColors = colors.genre as Record<string, string>;

/* ---------- types ---------- */

interface StoryRow {
  id: string;
  title: string;
  hook: string;
  genre: string[];
  triggers: string[];
  section_1: string;
  section_2: string;
  section_3: string;
  section_4: string;
  section_5: string;
  author_id: string;
  ai_disclaimer: boolean;
  users: {
    pen_name: string;
    real_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ReactionRecord {
  id: string;
  section: number;
  start_offset: number;
  end_offset: number;
  reaction_type: string;
  text_snippet: string;
}

interface InProgressStory {
  story: StoryRow;
  sectionsRead: number;
}

/* ---------- component ---------- */

export function ReadingMode({ isAdmin = false }: { isAdmin?: boolean }) {
  const supabase = createClient();
  const setMode = useModeStore((s) => s.setMode);

  const [userId, setUserId] = useState<string | null>(null);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [inProgress, setInProgress] = useState<InProgressStory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeStory, setActiveStory] = useState<StoryRow | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [poppedSections, setPoppedSections] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allRead, setAllRead] = useState(false);
  const sectionStartRef = useRef(Date.now());
  const [loggingOut, setLoggingOut] = useState(false);

  // Reaction state
  const [reactions, setReactions] = useState<ReactionRecord[]>([]);
  const [reactionsRemaining, setReactionsRemaining] = useState(10);
  const [reactionToolbar, setReactionToolbar] = useState<{
    x: number;
    y: number;
    section: number;
    startOffset: number;
    endOffset: number;
    snippet: string;
  } | null>(null);

  // Survey state
  const [surveyStep, setSurveyStep] = useState<null | "q1" | "q2" | "done">(null);
  const [q1Answer, setQ1Answer] = useState<string | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);

  // Exit survey state
  const [showExitSurvey, setShowExitSurvey] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);

  // Pop-py Garden state
  const [inGarden, setInGarden] = useState(false);
  const [gardenCount, setGardenCount] = useState(0);
  const [gardenLoading, setGardenLoading] = useState(false);

  // Load data
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get active popcycle
      const { data: popcycle } = await supabase
        .from("popcycles")
        .select("*")
        .in("status", ["submissions_open", "reading_open"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!popcycle) {
        setLoading(false);
        return;
      }

      // Get published stories (exclude user's own)
      const { data: storyData } = await supabase
        .from("stories")
        .select("*, users!author_id(pen_name, real_name, avatar_url)")
        .eq("popcycle_id", popcycle.id)
        .eq("status", "published")
        .neq("author_id", user.id);

      const allStories = (storyData ?? []) as StoryRow[];

      // Categorize stories by read status
      const unreadStories: StoryRow[] = [];
      const inProgressList: InProgressStory[] = [];
      for (const story of allStories) {
        const { data: pops } = await supabase
          .from("pops")
          .select("section_opened")
          .eq("reader_id", user.id)
          .eq("story_id", story.id);
        const count = pops?.length ?? 0;
        if (count === 0) {
          unreadStories.push(story);
        } else if (count < 5) {
          inProgressList.push({ story, sectionsRead: count });
        }
        // count >= 5: completed, exclude from feed entirely
      }
      setStories(unreadStories);
      setInProgress(inProgressList);
      setAllRead(unreadStories.length === 0 && inProgressList.length === 0 && allStories.length > 0);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build bubble data from current story
  const currentStory = stories[currentIndex];
  const bubbleData: StoryBubbleData | null = currentStory
    ? {
        id: currentStory.id,
        title: currentStory.title,
        genre: currentStory.genre[0] ?? "Literary Fiction",
        genreColor: genreColors[currentStory.genre[0] ?? ""] ?? colors.accent[500],
        triggers: currentStory.triggers ?? [],
        hook: currentStory.hook,
        authorPenName: currentStory.users?.pen_name ?? "unknown",
        aiDisclaimer: currentStory.ai_disclaimer ?? false,
      }
    : null;

  // Handle popping a story bubble to start reading
  const handlePopStory = useCallback(
    (data: StoryBubbleData) => {
      const story = stories.find((s) => s.id === data.id);
      if (story) {
        setActiveStory(story);
        setCurrentSection(0);
        setPoppedSections(new Set());
        setCompleted(false);
        sectionStartRef.current = Date.now();
      }
    },
    [stories],
  );

  // Handle swiping away a story
  const handleSwipeAway = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(stories.length, 1));
  }, [stories.length]);

  // Continue an in-progress story
  const handleContinue = useCallback(
    async (item: InProgressStory) => {
      setActiveStory(item.story);
      setCurrentSection(item.sectionsRead);
      // Mark already-read sections
      const existing = new Set<number>();
      for (let i = 1; i <= item.sectionsRead; i++) existing.add(i);
      setPoppedSections(existing);
      setCompleted(false);
      sectionStartRef.current = Date.now();
    },
    [],
  );

  // Record a pop via edge function and advance section
  const handleSectionPop = useCallback(async () => {
    if (!activeStory || !userId) return;

    const readDuration = Date.now() - sectionStartRef.current;
    const sectionToRecord = currentSection + 1; // 1-indexed

    if (readDuration >= MIN_READ_TIME_MS && !poppedSections.has(sectionToRecord)) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/score-pop`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                story_id: activeStory.id,
                section_opened: sectionToRecord,
                read_duration_ms: readDuration,
              }),
            },
          );
        } catch {
          // Pop is best-effort
        }
      }
      setPoppedSections((prev) => new Set([...prev, sectionToRecord]));
    }

    sectionStartRef.current = Date.now();

    if (currentSection >= 4) {
      setCompleted(true);
      setSurveyStep("q1");
    } else {
      setCurrentSection((prev) => prev + 1);
    }
  }, [activeStory, userId, currentSection, poppedSections, supabase]);

  // Go back to feed from reader — show exit survey if mid-story
  const handleBackToFeed = useCallback(() => {
    const readCount = poppedSections.size;
    if (readCount >= 1 && readCount < 5) {
      setShowExitSurvey(true);
    } else {
      setActiveStory(null);
      setCompleted(false);
      setSurveyStep(null);
      setCurrentIndex((prev) => (prev + 1) % Math.max(stories.length, 1));
    }
  }, [stories.length, poppedSections]);

  // Handle next story after completion
  const handleNextStory = useCallback(() => {
    setActiveStory(null);
    setCompleted(false);
    setCurrentIndex((prev) => (prev + 1) % Math.max(stories.length, 1));
  }, [stories.length]);

  // Handle text selection for reactions
  const handleTextSelect = useCallback(() => {
    if (!activeStory || reactionsRemaining <= 0) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setReactionToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const sectionIndex = currentSection + 1; // 1-indexed
    setReactionToolbar({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      section: sectionIndex,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      snippet: sel.toString().slice(0, 200),
    });
  }, [activeStory, currentSection, reactionsRemaining]);

  // Submit a reaction
  const submitReaction = useCallback(
    async (type: string) => {
      if (!reactionToolbar || !activeStory || !userId) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/record-reaction`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              story_id: activeStory.id,
              section: reactionToolbar.section,
              start_offset: reactionToolbar.startOffset,
              end_offset: reactionToolbar.endOffset,
              reaction_type: type,
              text_snippet: reactionToolbar.snippet,
            }),
          },
        );
        const result = await res.json();
        if (res.ok && result.reaction) {
          setReactions((prev) => [...prev, result.reaction]);
          setReactionsRemaining(result.reactions_remaining);
        }
      } catch {
        // Silently fail — reaction is non-critical
      }
      setReactionToolbar(null);
    },
    [reactionToolbar, activeStory, userId, supabase],
  );

  // Load existing reactions when opening a story
  useEffect(() => {
    if (!activeStory || !userId) return;
    (async () => {
      const { data } = await supabase
        .from("reactions")
        .select("id, section, start_offset, end_offset, reaction_type, text_snippet")
        .eq("story_id", activeStory.id)
        .eq("reader_id", userId);
      setReactions((data ?? []) as ReactionRecord[]);
      setReactionsRemaining(10 - (data?.length ?? 0));
    })();
  }, [activeStory?.id, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ending survey handler
  const handleSurveyAnswer = useCallback(
    async (question: "q1" | "q2", answer: string) => {
      if (question === "q1") {
        setQ1Answer(answer);
        setSurveyStep("q2");
      } else {
        setSurveyLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && activeStory) {
            await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/record-survey`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  story_id: activeStory.id,
                  q1_answer: q1Answer,
                  q2_answer: answer,
                }),
              },
            );
          }
        } catch {
          // Survey is best-effort
        }
        setSurveyLoading(false);
        setSurveyStep("done");
      }
    },
    [supabase, activeStory, q1Answer],
  );

  // Exit survey handler
  const handleExitReason = useCallback(
    async (reason: string) => {
      setExitLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && activeStory) {
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/record-exit-survey`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                story_id: activeStory.id,
                section_stopped_at: Math.max(...poppedSections),
                reason,
              }),
            },
          );
        }
      } catch {
        // Exit survey is best-effort
      }
      setExitLoading(false);
      setShowExitSurvey(false);
      setActiveStory(null);
      setCompleted(false);
      setCurrentIndex((prev) => (prev + 1) % Math.max(stories.length, 1));
    },
    [supabase, activeStory, poppedSections, stories.length],
  );

  // Pop-py Garden toggle
  const handleGardenToggle = useCallback(async () => {
    if (gardenLoading || !activeStory || !userId) return;
    setGardenLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (inGarden) {
        await supabase
          .from("poppy_gardens")
          .delete()
          .eq("reader_id", userId)
          .eq("story_id", activeStory.id);
        setInGarden(false);
        setGardenCount((c) => Math.max(0, c - 1));
      } else {
        await supabase
          .from("poppy_gardens")
          .insert({ reader_id: userId, story_id: activeStory.id });
        setInGarden(true);
        setGardenCount((c) => c + 1);
      }
    } catch {
      // Garden is best-effort
    }
    setGardenLoading(false);
  }, [gardenLoading, activeStory, userId, inGarden, supabase]);

  // Logout
  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  }, [supabase]);

  // Helper: render section text with reaction highlights overlaid
  const renderSectionWithHighlights = useCallback(
    (text: string, sectionIndex: number): ReactNode => {
      const sectionReactions = reactions.filter((r) => r.section === sectionIndex);
      if (sectionReactions.length === 0) return text;

      // Build a list of highlight ranges using indexOf on text_snippet
      const REACTION_TYPE_WEIGHTS: Record<string, number> = { like: 1.0, love: 1.5, laugh: 2.0, cry: 2.0, up: 1.0 };
      const ranges: { start: number; end: number; type: string }[] = [];
      const used = new Set<string>();

      for (const r of sectionReactions) {
        if (!r.text_snippet) continue;
        const key = `${r.text_snippet}`;
        // Find occurrence in text, skipping already-used identical snippets
        let searchFrom = 0;
        while (used.has(`${key}:${searchFrom}`)) {
          const idx = text.indexOf(r.text_snippet, searchFrom);
          if (idx === -1) break;
          searchFrom = idx + 1;
        }
        const idx = text.indexOf(r.text_snippet, searchFrom);
        if (idx === -1) continue;
        used.add(`${key}:${searchFrom}`);
        ranges.push({ start: idx, end: idx + r.text_snippet.length, type: r.reaction_type });
      }

      if (ranges.length === 0) return text;

      // Sort ranges by start position and merge overlapping ones
      ranges.sort((a, b) => a.start - b.start);
      const merged: { start: number; end: number; type: string }[] = [ranges[0]!];
      for (let i = 1; i < ranges.length; i++) {
        const prev = merged[merged.length - 1]!;
        const curr = ranges[i]!;
        if (curr.start <= prev.end) {
          prev.end = Math.max(prev.end, curr.end);
          // Use the higher-weight type when merging
          if ((REACTION_TYPE_WEIGHTS[curr.type] ?? 1.0) > (REACTION_TYPE_WEIGHTS[prev.type] ?? 1.0)) {
            prev.type = curr.type;
          }
        } else {
          merged.push(curr);
        }
      }

      // Build JSX fragments
      const highlightColors: Record<string, string> = {
        like: "bg-orange-100",
        love: "bg-pink-100",
        laugh: "bg-yellow-100",
        cry: "bg-blue-100",
        up: "bg-orange-100", // legacy
      };
      const parts: ReactNode[] = [];
      let cursor = 0;
      for (const range of merged) {
        if (range.start > cursor) {
          parts.push(text.slice(cursor, range.start));
        }
        parts.push(
          <mark
            key={`hl-${range.start}`}
            className={`${highlightColors[range.type] ?? "bg-orange-100"} rounded px-0.5`}
          >
            {text.slice(range.start, range.end)}
          </mark>,
        );
        cursor = range.end;
      }
      if (cursor < text.length) {
        parts.push(text.slice(cursor));
      }

      return <>{parts}</>;
    },
    [reactions],
  );

  // ---------- Inline Reader ----------
  if (activeStory) {
    const sections = [
      activeStory.section_1,
      activeStory.section_2,
      activeStory.section_3,
      activeStory.section_4,
      activeStory.section_5,
    ].filter(Boolean);

    const genreColor = genreColors[activeStory.genre[0] ?? ""] ?? colors.accent[500];

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur border-b border-slate-200">
          <button
            onClick={handleBackToFeed}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            &larr; Back to feed
          </button>
          <div className="flex items-center gap-2">
            {sections.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= currentSection
                    ? "bg-orange-500"
                    : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Story header */}
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {activeStory.genre.map((g: string, i: number) => (
              <span
                key={g}
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: i === 0 ? genreColor : (genreColors[g] ?? colors.accent[500]) }}
              >
                {g}
              </span>
            ))}
            {activeStory.ai_disclaimer && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
                AI-Assisted
              </span>
            )}
            {activeStory.triggers?.map((tw: string) => (
              <span
                key={tw}
                className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"
              >
                {tw}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {activeStory.title}
          </h1>
          <p className="mt-1 text-slate-500 italic">{activeStory.hook}</p>
          <p className="mt-2 text-xs text-slate-400">
            by @{activeStory.users?.pen_name ?? "unknown"}
          </p>
        </div>

        {/* Sections */}
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {sections.map((section, i) => {
            if (i > currentSection + 1) return null;

            const isRead = i < currentSection;
            const isCurrent = i === currentSection;
            const isNext = i === currentSection + 1;
            const isLast = i === sections.length - 1;

            // Next section: show text blurred with bubble overlay
            if (isNext && !completed) {
              return (
                <div key={i} className="relative">
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Section {i + 1} of {sections.length}
                    </span>
                  </div>
                  <div className="blur-sm select-none pointer-events-none">
                    <div className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-700 mb-6">
                      {section}
                    </div>
                  </div>
                  <SectionPopBarrier
                    sectionNumber={i}
                    totalSections={sections.length}
                    color={genreColor}
                    onPop={handleSectionPop}
                    overlay
                  />
                </div>
              );
            }

            // Only render read or current sections
            if (!isCurrent && !isRead) return null;

            return (
              <div key={i}>
                <div className="mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Section {i + 1} of {sections.length}
                  </span>
                </div>

                <div
                  className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-700 mb-6"
                  onMouseUp={handleTextSelect}
                  onTouchEnd={handleTextSelect}
                >
                  {renderSectionWithHighlights(section, i + 1)}
                </div>

                {/* Completion area for last section */}
                {isCurrent && isLast && (
                  <div className="mt-8 text-center py-10">
                    {!completed ? (
                      <SectionPopBarrier
                        sectionNumber={i}
                        totalSections={sections.length}
                        color={genreColor}
                        onPop={handleSectionPop}
                      />
                    ) : surveyStep === "q1" ? (
                      <div className="space-y-4 max-w-md mx-auto">
                        <p className="text-lg font-bold text-slate-800">
                          {ENDING_SURVEY_QUESTIONS.q1.prompt}
                        </p>
                        <div className="space-y-2">
                          {ENDING_SURVEY_QUESTIONS.q1.options.map((opt) => (
                            <button
                              key={opt.key}
                              onClick={() => handleSurveyAnswer("q1", opt.key)}
                              className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-orange-400 transition-colors text-sm"
                            >
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold mr-3">
                                {opt.key}
                              </span>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : surveyStep === "q2" ? (
                      <div className="space-y-4 max-w-md mx-auto">
                        <p className="text-lg font-bold text-slate-800">
                          {ENDING_SURVEY_QUESTIONS.q2.prompt}
                        </p>
                        <div className="space-y-2">
                          {ENDING_SURVEY_QUESTIONS.q2.options.map((opt) => (
                            <button
                              key={opt.key}
                              onClick={() => handleSurveyAnswer("q2", opt.key)}
                              disabled={surveyLoading}
                              className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-orange-400 transition-colors text-sm disabled:opacity-50"
                            >
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold mr-3">
                                {opt.key}
                              </span>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-4xl">🎉</div>
                        <p className="text-xl font-bold text-orange-500">
                          Story Complete!
                        </p>
                        <p className="text-slate-500 text-sm">
                          Thanks for reading &ldquo;{activeStory.title}&rdquo;
                        </p>
                        <button
                          onClick={handleGardenToggle}
                          disabled={gardenLoading}
                          className={`mt-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ${
                            inGarden
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-white border-2 border-orange-400 text-orange-600 hover:bg-orange-50"
                          }`}
                        >
                          {gardenLoading ? "..." : inGarden ? "🌱 In your Pop-py Garden" : "🌻 Add to Pop-py Garden"}
                        </button>
                        {gardenCount > 0 && (
                          <p className="text-xs text-green-600">
                            In {gardenCount} garden{gardenCount !== 1 ? "s" : ""}
                          </p>
                        )}
                        <button
                          onClick={handleNextStory}
                          className="mt-4 px-8 py-3 rounded-full bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
                        >
                          Next Story
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider between read sections */}
                {isRead && (
                  <hr className="my-6 border-slate-200" />
                )}
              </div>
            );
          })}
        </div>

        {/* Exit survey overlay */}
        {showExitSurvey && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-slate-800">
                Why did you stop reading?
              </h3>
              <p className="text-xs text-slate-400">Your feedback helps writers improve</p>
              <div className="space-y-2">
                {EXIT_SURVEY_REASONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => handleExitReason(r.key)}
                    disabled={exitLoading}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-orange-400 transition-colors text-sm disabled:opacity-50"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowExitSurvey(false);
                  setActiveStory(null);
                  setCompleted(false);
                  setCurrentIndex((prev) => (prev + 1) % Math.max(stories.length, 1));
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 underline"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Reaction toolbar (floating) */}
        {reactionToolbar && (
          <div
            className="fixed z-50 flex items-center gap-1 rounded-full bg-white shadow-lg border border-slate-200 px-2 py-1"
            style={{
              left: Math.max(60, Math.min(reactionToolbar.x, window.innerWidth - 60)),
              top: Math.max(40, reactionToolbar.y - 44),
              transform: "translateX(-50%)",
            }}
          >
            {REACTION_TYPES.map((rt) => (
              <button
                key={rt.key}
                onClick={() => submitReaction(rt.key)}
                className="px-2 py-1 rounded-full text-lg hover:bg-slate-100 transition-colors"
                title={rt.label}
              >
                {rt.emoji}
              </button>
            ))}
            <button
              onClick={() => {
                setReactionToolbar(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="px-1.5 py-0.5 rounded-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Reactions remaining counter */}
        {reactionsRemaining < 10 && (
          <div className="fixed bottom-4 right-4 z-40 rounded-full bg-white shadow border border-slate-200 px-3 py-1.5 text-xs text-slate-500">
            {reactionsRemaining} reaction{reactionsRemaining !== 1 ? "s" : ""} remaining
          </div>
        )}
      </div>
    );
  }

  // ---------- Feed / Bubble View ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-lg">Loading stories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Corner controls */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={() => setMode("chooser")}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors"
        >
          Switch to Writing
        </button>
      </div>
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {isAdmin && (
          <a
            href="/admin"
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
          >
            Admin
          </a>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {loggingOut ? "..." : "Logout"}
        </button>
      </div>

      {/* Continue reading section */}
      {inProgress.length > 0 && (
        <div className="absolute top-14 left-0 right-0 z-20 px-4">
          <div className="max-w-md mx-auto">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Continue where you left off
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
              {inProgress.map((item) => (
                <button
                  key={item.story.id}
                  onClick={() => handleContinue(item)}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-400 transition-colors shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-700 truncate max-w-[140px]">
                    {item.story.title}
                  </p>
                  <div className="mt-1.5 w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-orange-500"
                      style={{ width: `${(item.sectionsRead / 5) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {item.sectionsRead}/5 sections
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story bubble */}
      {stories.length > 0 && bubbleData ? (
        <>
          <StoryBubbleCanvas
            key={bubbleData.id}
            story={bubbleData}
            onPop={handlePopStory}
            onSwipeAway={handleSwipeAway}
          />
          {/* Instructions at bottom */}
          <div className="absolute bottom-12 left-0 right-0 z-20 text-center pointer-events-none">
            <p className="text-sm text-slate-400">
              Pop to read &middot; Swipe to skip
            </p>
          </div>
        </>
      ) : allRead ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-3 max-w-md mx-auto px-4">
            <div className="text-5xl">&#127881;</div>
            <p className="text-xl font-bold text-slate-800">You've read every story!</p>
            <p className="text-sm text-slate-500">
              Check back later for new submissions, and be sure to come back for the live PopOff reveal!
            </p>
            <button
              onClick={() => setMode("writing")}
              className="mt-4 px-6 py-2.5 rounded-full bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors text-sm"
            >
              Switch to Writing
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-slate-500">No stories yet</p>
            <p className="text-sm text-slate-400">Check back soon for the next popcycle!</p>
          </div>
        </div>
      )}
    </div>
  );
}
