"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { calculateVelocity, awardWildcard } from "../actions";

// ── Velocity Cell ───────────────────────────────────────────────────────

export function VelocityCell({ storyId }: { storyId: string }) {
  const [data, setData] = useState<{
    recentPops: number;
    previousPops: number;
    acceleration: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateVelocity(storyId).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [storyId]);

  if (loading) {
    return <span className="text-xs text-[var(--color-text-secondary)] italic">Loading...</span>;
  }

  if (!data) {
    return <span className="text-xs text-[var(--color-text-secondary)]">N/A</span>;
  }

  const accelColor =
    data.acceleration > 0
      ? "text-green-600"
      : data.acceleration < 0
        ? "text-red-500"
        : "text-[var(--color-text-secondary)]";

  return (
    <div className="text-xs">
      <p className="text-[var(--color-text)]">
        {data.recentPops} pops/24h
      </p>
      <p className={accelColor}>
        {data.acceleration > 0 ? "+" : ""}
        {data.acceleration}% vs prev 24h
      </p>
    </div>
  );
}

// ── Award Wildcard Button ───────────────────────────────────────────────

export function AwardWildcardButton({
  storyId,
  popcycleId,
  storyTitle,
}: {
  storyId: string;
  popcycleId: string;
  storyTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleAward() {
    if (!confirm(`Award wildcard to "${storyTitle}"?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await awardWildcard(storyId, popcycleId);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: "Wildcard awarded!" });
        setTimeout(() => {
          setFeedback(null);
          router.refresh();
        }, 1500);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleAward}
        disabled={isPending}
        className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Awarding..." : "Award Wildcard"}
      </button>
      {feedback && (
        <span
          className={`text-xs ${feedback.type === "error" ? "text-red-500" : "text-green-600"}`}
        >
          {feedback.msg}
        </span>
      )}
    </div>
  );
}
