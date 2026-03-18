"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { overrideScore, recalculateScore } from "../actions";

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

// ── Override Score Modal ────────────────────────────────────────────────────

interface OverrideScoreButtonProps {
  scoreId: string;
  storyTitle: string;
  currentDisplayScore: number;
}

export function OverrideScoreButton({ scoreId, storyTitle, currentDisplayScore }: OverrideScoreButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newScore, setNewScore] = useState(String(currentDisplayScore));

  function handleSave() {
    setError(null);
    const parsed = Number(newScore);
    if (isNaN(parsed) || parsed < 0) {
      setError("Score must be a non-negative number.");
      return;
    }

    startTransition(async () => {
      const result = await overrideScore(scoreId, parsed);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
      >
        Override
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-lg bg-[var(--color-background)] p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-[var(--color-text)]">Override Score</h2>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          Manually set display_score for &ldquo;{storyTitle}&rdquo;
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
            New Display Score (current: {currentDisplayScore})
          </label>
          <input
            type="number"
            value={newScore}
            onChange={(e) => setNewScore(e.target.value)}
            className={fieldClass}
            min="0"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving..." : "Set Score"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recalculate Button ──────────────────────────────────────────────────────

interface RecalculateScoreButtonProps {
  scoreId: string;
}

export function RecalculateScoreButton({ scoreId }: RecalculateScoreButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function handleRecalculate() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await recalculateScore(scoreId);
      if (res.error) {
        setError(res.error);
      } else {
        setResult(`Recalculated: ${res.displayScore}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handleRecalculate}
        disabled={isPending}
        className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? "..." : "Recalc"}
      </button>
      {error && <span className="text-xs text-red-500" title={error}>!</span>}
      {result && <span className="text-xs text-green-600">{result}</span>}
    </div>
  );
}

// ── Flag Anomaly Button ─────────────────────────────────────────────────────

interface FlagAnomalyButtonProps {
  scoreId: string;
  storyTitle: string;
}

export function FlagAnomalyButton({ scoreId, storyTitle }: FlagAnomalyButtonProps) {
  const [flagged, setFlagged] = useState(false);

  function handleFlag() {
    if (!confirm(`Flag score for "${storyTitle}" for review?`)) return;
    // For now, flag locally. In future, this writes to a flags/audit_log table.
    setFlagged(true);
  }

  if (flagged) {
    return (
      <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
        Flagged
      </span>
    );
  }

  return (
    <button
      onClick={handleFlag}
      className="rounded px-2 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-50 transition-colors"
    >
      Flag
    </button>
  );
}
