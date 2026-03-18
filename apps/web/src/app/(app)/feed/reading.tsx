"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { StoryBubbleCanvas, type StoryBubbleData } from "@/components/ui/story-bubble";
import { SectionPopBarrier } from "@/components/ui/section-pop-barrier";
import { useModeStore } from "@/stores/mode";
import { MIN_READ_TIME_MS } from "@poplit/core/constants";
import { colors } from "@poplit/ui";

const genreColors = colors.genre as Record<string, string>;

/* ---------- types ---------- */

interface StoryRow {
  id: string;
  title: string;
  hook: string;
  genre: string;
  triggers: string[];
  section_1: string;
  section_2: string;
  section_3: string;
  section_4: string;
  section_5: string;
  author_id: string;
  users: {
    pen_name: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface InProgressStory {
  story: StoryRow;
  sectionsRead: number;
}

/* ---------- component ---------- */

export function ReadingMode() {
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
  const sectionStartRef = useRef(Date.now());
  const [loggingOut, setLoggingOut] = useState(false);

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

      // Get published stories
      const { data: storyData } = await supabase
        .from("stories")
        .select("*, users!author_id(pen_name, display_name, avatar_url)")
        .eq("popcycle_id", popcycle.id)
        .eq("status", "published");

      const allStories = (storyData ?? []) as StoryRow[];
      setStories(allStories);

      // Check in-progress
      const inProgressList: InProgressStory[] = [];
      for (const story of allStories) {
        const { data: pops } = await supabase
          .from("pops")
          .select("section_opened")
          .eq("reader_id", user.id)
          .eq("story_id", story.id);
        const count = pops?.length ?? 0;
        if (count > 0 && count < 5) {
          inProgressList.push({ story, sectionsRead: count });
        }
      }
      setInProgress(inProgressList);
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
        genre: currentStory.genre,
        genreColor: genreColors[currentStory.genre] ?? colors.accent[500],
        triggers: currentStory.triggers ?? [],
        hook: currentStory.hook,
        authorPenName: currentStory.users?.pen_name ?? "unknown",
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

  // Record a pop and advance section
  const handleSectionPop = useCallback(async () => {
    if (!activeStory || !userId) return;

    const readDuration = Date.now() - sectionStartRef.current;
    const sectionToRecord = currentSection + 1; // 1-indexed

    if (readDuration >= MIN_READ_TIME_MS && !poppedSections.has(sectionToRecord)) {
      await supabase.from("pops").insert({
        reader_id: userId,
        story_id: activeStory.id,
        section_opened: sectionToRecord,
        weighted_value: 1,
        read_duration_ms: readDuration,
      });
      setPoppedSections((prev) => new Set([...prev, sectionToRecord]));
    }

    sectionStartRef.current = Date.now();

    if (currentSection >= 4) {
      setCompleted(true);
    } else {
      setCurrentSection((prev) => prev + 1);
    }
  }, [activeStory, userId, currentSection, poppedSections, supabase]);

  // Go back to feed from reader
  const handleBackToFeed = useCallback(() => {
    setActiveStory(null);
    setCompleted(false);
    // Advance to next story
    setCurrentIndex((prev) => (prev + 1) % Math.max(stories.length, 1));
  }, [stories.length]);

  // Handle next story after completion
  const handleNextStory = useCallback(() => {
    setActiveStory(null);
    setCompleted(false);
    setCurrentIndex((prev) => (prev + 1) % Math.max(stories.length, 1));
  }, [stories.length]);

  // Logout
  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  }, [supabase]);

  // ---------- Inline Reader ----------
  if (activeStory) {
    const sections = [
      activeStory.section_1,
      activeStory.section_2,
      activeStory.section_3,
      activeStory.section_4,
      activeStory.section_5,
    ].filter(Boolean);

    const genreColor = genreColors[activeStory.genre] ?? colors.accent[500];

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={handleBackToFeed}
            className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
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
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Story header */}
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: genreColor }}
            >
              {activeStory.genre}
            </span>
            {activeStory.triggers?.map((tw: string) => (
              <span
                key={tw}
                className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
              >
                {tw}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
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
            if (i > currentSection) return null;

            const isCurrentVisible = i === currentSection;
            const isLast = i === sections.length - 1;

            return (
              <div key={i}>
                <div className="mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Section {i + 1} of {sections.length}
                  </span>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 mb-6">
                  {section}
                </div>

                {/* Pop barrier between sections */}
                {isCurrentVisible && !isLast && !completed && (
                  <SectionPopBarrier
                    sectionNumber={i}
                    totalSections={sections.length}
                    color={genreColor}
                    onPop={handleSectionPop}
                  />
                )}

                {/* Completion */}
                {isCurrentVisible && isLast && (
                  <div className="mt-8 text-center py-10">
                    {!completed ? (
                      <SectionPopBarrier
                        sectionNumber={i}
                        totalSections={sections.length}
                        color={genreColor}
                        onPop={handleSectionPop}
                      />
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
                {i < currentSection && (
                  <hr className="my-6 border-slate-200 dark:border-slate-800" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Feed / Bubble View ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-lg">Loading stories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Corner controls */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={() => setMode("chooser")}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
        >
          Switch to Writing
        </button>
      </div>
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
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
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-400 transition-colors shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-700 dark:text-white truncate max-w-[140px]">
                    {item.story.title}
                  </p>
                  <div className="mt-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
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
