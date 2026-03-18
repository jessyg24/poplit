"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@poplit/core/types";
import {
  updateUserRole,
  toggleWatchlist,
  issueStrike,
  getCurrentAdminId,
} from "../actions";

// ── Edit Role ──────────────────────────────────────────────────────────────

export function EditRoleButton({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: UserRole;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(currentRole);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit() {
    if (role === currentRole) {
      setOpen(false);
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await updateUserRole(userId, role);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: `Role updated to ${role}` });
        setTimeout(() => {
          setOpen(false);
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
        className="text-xs text-[var(--color-primary)] hover:underline"
      >
        Edit Role
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-5 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Change Role</h3>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="reader">Reader</option>
          <option value="writer">Writer</option>
          <option value="admin">Admin</option>
        </select>

        {feedback && (
          <p className={`mb-2 text-xs ${feedback.type === "error" ? "text-red-500" : "text-green-600"}`}>
            {feedback.msg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => { setOpen(false); setFeedback(null); }}
            className="rounded-md px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Issue Strike ───────────────────────────────────────────────────────────

export function IssueStrikeButton({
  userId,
  penName,
}: {
  userId: string;
  penName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit() {
    if (!reason.trim()) {
      setFeedback({ type: "error", msg: "Reason is required" });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const adminId = await getCurrentAdminId();
      if (!adminId) {
        setFeedback({ type: "error", msg: "Could not determine admin user" });
        return;
      }
      const result = await issueStrike(userId, adminId, reason.trim(), evidence.trim() || undefined);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: "Strike issued" });
        setTimeout(() => {
          setOpen(false);
          setReason("");
          setEvidence("");
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
        Strike
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-5 shadow-xl">
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Issue Strike</h3>
        <p className="mb-3 text-xs text-[var(--color-text-secondary)]">Against: {penName}</p>

        <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
          placeholder="Why is this strike being issued?"
        />

        <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Evidence</label>
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
          placeholder="Links, screenshots, etc. (optional)"
        />

        {feedback && (
          <p className={`mb-2 text-xs ${feedback.type === "error" ? "text-red-500" : "text-green-600"}`}>
            {feedback.msg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => { setOpen(false); setFeedback(null); setReason(""); setEvidence(""); }}
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
            {isPending ? "Issuing..." : "Issue Strike"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle Watchlist ───────────────────────────────────────────────────────

export function ToggleWatchlistButton({
  userId,
  isWatched,
}: {
  userId: string;
  isWatched: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleRemove() {
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleWatchlist(userId, false);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        router.refresh();
      }
    });
  }

  function handleAdd() {
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleWatchlist(userId, true, reason.trim() || undefined);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setOpen(false);
        setReason("");
        setFeedback(null);
        router.refresh();
      }
    });
  }

  if (isWatched) {
    return (
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="text-xs text-yellow-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "Removing..." : "Unwatch"}
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-yellow-600 hover:underline"
      >
        Watch
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-5 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Add to Watchlist</h3>

        <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
          placeholder="Why are they being watched?"
        />

        {feedback && (
          <p className="mb-2 text-xs text-red-500">{feedback.msg}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => { setOpen(false); setFeedback(null); setReason(""); }}
            className="rounded-md px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add to Watchlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
