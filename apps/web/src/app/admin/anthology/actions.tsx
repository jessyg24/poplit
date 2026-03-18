"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getTopStoriesForPopcycle,
  addToAnthology,
  removeFromAnthology,
} from "../actions";

// ── View Top Stories Button ─────────────────────────────────────────────

interface TopStory {
  storyId: string;
  title: string;
  author: string;
  rank: number | null;
  displayScore: number;
  alreadyInAnthology: boolean;
}

export function ViewTopStoriesButton({
  popcycleId,
  popcycleTitle,
}: {
  popcycleId: string;
  popcycleTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stories, setStories] = useState<TopStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    setFeedback(null);
    const result = await getTopStoriesForPopcycle(popcycleId);
    if (result.error) {
      setFeedback({ type: "error", msg: result.error });
    }
    setStories(result.stories ?? []);
    setLoading(false);
  }

  function handleSelect(storyId: string) {
    setFeedback(null);
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const quarter = `Q${q} ${now.getFullYear()}`;

    startTransition(async () => {
      const result = await addToAnthology(storyId, popcycleId, quarter);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: "Added to anthology!" });
        // Refresh the story list
        const refreshed = await getTopStoriesForPopcycle(popcycleId);
        setStories(refreshed.stories ?? []);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="text-xs font-medium text-[var(--color-primary)] hover:underline"
      >
        View Top Stories
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-[var(--color-text)]">Top Stories</h3>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{popcycleTitle}</p>

        {feedback && (
          <div
            className={`mb-3 rounded-md border p-2 text-xs ${
              feedback.type === "error"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-green-300 bg-green-50 text-green-700"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {loading ? (
          <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">Loading stories...</p>
        ) : stories.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">No scored stories found for this popcycle.</p>
        ) : (
          <div className="space-y-2">
            {stories.map((story) => (
              <div
                key={story.storyId}
                className="flex items-center justify-between rounded-md bg-[var(--color-surface)] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    #{story.rank ?? "-"} {story.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    by {story.author} &middot; Score: {story.displayScore}
                  </p>
                </div>
                {story.alreadyInAnthology ? (
                  <span className="text-xs font-medium text-green-600">In Anthology</span>
                ) : (
                  <button
                    onClick={() => handleSelect(story.storyId)}
                    disabled={isPending}
                    className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
                  >
                    {isPending ? "Adding..." : "Select"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => { setOpen(false); setFeedback(null); }}
            className="rounded-md px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Remove from Anthology Button ────────────────────────────────────────

export function RemoveFromAnthologyButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    if (!confirm("Remove this story from the anthology?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeFromAnthology(entryId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Removing..." : "Remove"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
