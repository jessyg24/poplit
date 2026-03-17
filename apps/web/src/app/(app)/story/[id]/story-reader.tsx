"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_READ_TIME_MS } from "@poplit/core/constants";

interface StoryReaderProps {
  storyId: string;
  authorId: string;
  sections: string[];
  existingPops: number[];
  isFollowing: boolean;
  isOwnStory: boolean;
  readerId: string | null;
  mode: "reader" | "follow-button";
}

export function StoryReader({
  storyId,
  authorId,
  sections,
  existingPops,
  isFollowing: initialFollowing,
  isOwnStory,
  readerId,
  mode,
}: StoryReaderProps) {
  const supabase = createClient();
  const [currentSection, setCurrentSection] = useState(
    Math.min(existingPops.length, sections.length - 1),
  );
  const [poppedSections, setPoppedSections] = useState<Set<number>>(
    new Set(existingPops),
  );
  const [following, setFollowing] = useState(initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const sectionStartTime = useRef<number>(Date.now());

  const recordPop = useCallback(
    async (sectionIndex: number) => {
      if (!readerId || isOwnStory || poppedSections.has(sectionIndex + 1))
        return;

      const readDuration = Date.now() - sectionStartTime.current;
      if (readDuration < MIN_READ_TIME_MS) return;

      const { error } = await supabase.from("pops").insert({
        reader_id: readerId,
        story_id: storyId,
        section_opened: sectionIndex + 1,
        weighted_value: 1,
        read_duration_ms: readDuration,
      });

      if (!error) {
        setPoppedSections((prev) => new Set([...prev, sectionIndex + 1]));
      }
    },
    [readerId, isOwnStory, poppedSections, storyId, supabase],
  );

  const handleContinue = useCallback(async () => {
    await recordPop(currentSection);
    sectionStartTime.current = Date.now();
    setCurrentSection((prev) => Math.min(prev + 1, sections.length - 1));
  }, [currentSection, recordPop, sections.length]);

  const handleFollow = useCallback(async () => {
    if (!readerId || isOwnStory) return;
    setFollowLoading(true);

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", readerId)
        .eq("following_id", authorId);
      setFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: readerId, following_id: authorId });
      setFollowing(true);
    }

    setFollowLoading(false);
  }, [readerId, isOwnStory, following, supabase, authorId]);

  // Follow button mode
  if (mode === "follow-button") {
    if (isOwnStory || !readerId) return null;
    return (
      <button
        type="button"
        onClick={handleFollow}
        disabled={followLoading}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
          following
            ? "border border-[var(--color-border)] hover:bg-[var(--color-background)]"
            : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
        }`}
      >
        {followLoading ? "..." : following ? "Following" : "Follow"}
      </button>
    );
  }

  // Reader mode
  return (
    <div className="space-y-8">
      {sections.map((section, i) => {
        if (i > currentSection) return null;

        const isLast = i === sections.length - 1;
        const isCurrentVisible = i === currentSection;
        const hasPop = poppedSections.has(i + 1);

        return (
          <div key={i}>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Section {i + 1} of {sections.length}
              </span>
              {hasPop && (
                <span className="text-xs text-[var(--color-primary)] font-semibold">
                  Popped
                </span>
              )}
            </div>

            {/* Section content */}
            <div className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
              {section}
            </div>

            {/* Continue button */}
            {isCurrentVisible && !isLast && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="px-8 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Continue Reading
                </button>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                  Section {i + 2} of {sections.length}
                </p>
              </div>
            )}

            {/* Completion */}
            {isCurrentVisible && isLast && (
              <div className="mt-8 text-center py-8 border-t border-[var(--color-border)]">
                <p className="text-lg font-bold text-[var(--color-primary)]">
                  Story Complete
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Thanks for reading!
                </p>
              </div>
            )}

            {/* Divider between sections */}
            {i < currentSection && (
              <hr className="my-8 border-[var(--color-border)]" />
            )}
          </div>
        );
      })}

      {/* Progress indicator */}
      <div className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg">
          {sections.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= currentSection
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-border)]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
