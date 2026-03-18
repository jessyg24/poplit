"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSponsor, removeSponsor } from "../actions";

// ── Edit Sponsor Button ─────────────────────────────────────────────────

export function EditSponsorButton({
  popcycleId,
  currentName,
  currentLogoUrl,
}: {
  popcycleId: string;
  currentName: string | null;
  currentLogoUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sponsorName, setSponsorName] = useState(currentName ?? "");
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit() {
    if (!sponsorName.trim()) {
      setFeedback({ type: "error", msg: "Sponsor name is required" });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await updateSponsor(popcycleId, sponsorName.trim(), logoUrl.trim());
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: "Sponsor updated!" });
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
        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
      >
        Edit Sponsor
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-5 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Edit Sponsor Info</h3>

        <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
          Sponsor Name *
        </label>
        <input
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
          placeholder="Sponsor name"
        />

        <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
          Sponsor Logo URL
        </label>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
          placeholder="https://example.com/logo.png"
        />

        {feedback && (
          <p
            className={`mb-2 text-xs ${
              feedback.type === "error" ? "text-red-500" : "text-green-600"
            }`}
          >
            {feedback.msg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setOpen(false);
              setFeedback(null);
              setSponsorName(currentName ?? "");
              setLogoUrl(currentLogoUrl ?? "");
            }}
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

// ── Remove Sponsor Button ───────────────────────────────────────────────

export function RemoveSponsorButton({
  popcycleId,
  sponsorName,
}: {
  popcycleId: string;
  sponsorName: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!sponsorName) return null;

  function handleRemove() {
    if (!confirm(`Remove sponsor "${sponsorName}" from this popcycle?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeSponsor(popcycleId);
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
        {isPending ? "Removing..." : "Remove Sponsor"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
