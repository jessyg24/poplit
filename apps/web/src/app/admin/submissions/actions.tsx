"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveSubmission, rejectSubmission } from "../actions";

// ── Approve Button ─────────────────────────────────────────────────────────

export function ApproveButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleClick() {
    if (!confirm("Approve and publish this submission?")) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await approveSubmission(storyId);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: "Published" });
        setTimeout(() => {
          setFeedback(null);
          router.refresh();
        }, 800);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-green-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "..." : "Approve"}
      </button>
      {feedback && (
        <span className={`text-xs ${feedback.type === "error" ? "text-red-500" : "text-green-600"}`}>
          {feedback.msg}
        </span>
      )}
    </div>
  );
}

// ── Reject Button ──────────────────────────────────────────────────────────

export function RejectButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit() {
    if (!reason.trim()) {
      setFeedback({ type: "error", msg: "Rejection reason is required" });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await rejectSubmission(storyId, reason.trim());
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: "Rejected" });
        setTimeout(() => {
          setOpen(false);
          setReason("");
          setFeedback(null);
          router.refresh();
        }, 800);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-600 hover:underline"
      >
        Reject
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-5 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Reject Submission</h3>

        <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
          placeholder="Why is this submission being rejected?"
          autoFocus
        />

        {feedback && (
          <p className={`mb-2 text-xs ${feedback.type === "error" ? "text-red-500" : "text-green-600"}`}>
            {feedback.msg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => { setOpen(false); setReason(""); setFeedback(null); }}
            className="rounded-md px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
