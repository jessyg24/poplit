"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePopcycle, deletePopcycle, updatePopcycleStatus } from "../actions";
import type { PopcycleStatus } from "@poplit/core/types";

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-text)] mb-1";

const STATUS_ORDER: PopcycleStatus[] = [
  "draft",
  "scheduled",
  "submissions_open",
  "reading_open",
  "popoff",
  "completed",
];

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Edit Modal ──────────────────────────────────────────────────────────────

interface EditPopcycleButtonProps {
  popcycle: Record<string, any>;
}

export function EditPopcycleButton({ popcycle }: EditPopcycleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: popcycle.title,
    prompt: popcycle.prompt,
    description: popcycle.description ?? "",
    format: popcycle.format,
    submissions_open_at: toLocalDatetime(popcycle.submissions_open_at),
    submissions_close_at: toLocalDatetime(popcycle.submissions_close_at),
    reading_open_at: toLocalDatetime(popcycle.reading_open_at),
    reading_close_at: toLocalDatetime(popcycle.reading_close_at),
    popoff_at: toLocalDatetime(popcycle.popoff_at),
    entry_fee_cents: popcycle.entry_fee_cents,
    first_pct: popcycle.first_pct,
    second_pct: popcycle.second_pct,
    third_pct: popcycle.third_pct,
    house_pct: popcycle.house_pct,
    sponsor_name: popcycle.sponsor_name ?? "",
    sponsor_logo_url: popcycle.sponsor_logo_url ?? "",
  });

  function update(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePopcycle(popcycle.id, {
        title: form.title,
        prompt: form.prompt,
        description: form.description || null,
        format: form.format,
        submissions_open_at: new Date(form.submissions_open_at).toISOString(),
        submissions_close_at: new Date(form.submissions_close_at).toISOString(),
        reading_open_at: new Date(form.reading_open_at).toISOString(),
        reading_close_at: new Date(form.reading_close_at).toISOString(),
        popoff_at: new Date(form.popoff_at).toISOString(),
        entry_fee_cents: Number(form.entry_fee_cents),
        first_pct: Number(form.first_pct),
        second_pct: Number(form.second_pct),
        third_pct: Number(form.third_pct),
        house_pct: Number(form.house_pct),
        sponsor_name: form.sponsor_name || null,
        sponsor_logo_url: form.sponsor_logo_url || null,
      });

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
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--color-background)] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">Edit Popcycle</h2>

        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input value={form.title} onChange={(e) => update("title", e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Prompt</label>
            <textarea value={form.prompt} onChange={(e) => update("prompt", e.target.value)} className={fieldClass} rows={3} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className={fieldClass} rows={2} />
          </div>
          <div>
            <label className={labelClass}>Format</label>
            <select value={form.format} onChange={(e) => update("format", e.target.value)} className={fieldClass}>
              <option value="standard">Standard</option>
              <option value="flash">Flash</option>
              <option value="themed">Themed</option>
              <option value="sponsored">Sponsored</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Submissions Open</label>
              <input type="datetime-local" value={form.submissions_open_at} onChange={(e) => update("submissions_open_at", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Submissions Close</label>
              <input type="datetime-local" value={form.submissions_close_at} onChange={(e) => update("submissions_close_at", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Reading Opens</label>
              <input type="datetime-local" value={form.reading_open_at} onChange={(e) => update("reading_open_at", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Reading Closes</label>
              <input type="datetime-local" value={form.reading_close_at} onChange={(e) => update("reading_close_at", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Pop-Off Date</label>
              <input type="datetime-local" value={form.popoff_at} onChange={(e) => update("popoff_at", e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Entry Fee (cents)</label>
              <input type="number" value={form.entry_fee_cents} onChange={(e) => update("entry_fee_cents", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>1st Place %</label>
              <input type="number" value={form.first_pct} onChange={(e) => update("first_pct", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>2nd Place %</label>
              <input type="number" value={form.second_pct} onChange={(e) => update("second_pct", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>3rd Place %</label>
              <input type="number" value={form.third_pct} onChange={(e) => update("third_pct", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>House %</label>
              <input type="number" value={form.house_pct} onChange={(e) => update("house_pct", e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Sponsor Name</label>
              <input value={form.sponsor_name} onChange={(e) => update("sponsor_name", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Sponsor Logo URL</label>
              <input value={form.sponsor_logo_url} onChange={(e) => update("sponsor_logo_url", e.target.value)} className={fieldClass} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
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
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Change ───────────────────────────────────────────────────────────

interface ChangeStatusButtonProps {
  popcycleId: string;
  currentStatus: PopcycleStatus;
}

export function ChangeStatusButton({ popcycleId, currentStatus }: ChangeStatusButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const nextStatus = currentIndex >= 0 && currentIndex < STATUS_ORDER.length - 1
    ? STATUS_ORDER[currentIndex + 1]
    : null;

  if (!nextStatus) return null;

  function handleAdvance() {
    setError(null);
    startTransition(async () => {
      const result = await updatePopcycleStatus(popcycleId, nextStatus!);
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
        onClick={handleAdvance}
        disabled={isPending}
        className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
        title={`Advance to ${nextStatus.replace(/_/g, " ")}`}
      >
        {isPending ? "..." : `→ ${nextStatus.replace(/_/g, " ")}`}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

// ── Delete Button ───────────────────────────────────────────────────────────

interface DeletePopcycleButtonProps {
  popcycleId: string;
  status: PopcycleStatus;
  title: string;
}

export function DeletePopcycleButton({ popcycleId, status, title }: DeletePopcycleButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "draft") return null;

  function handleDelete() {
    if (!confirm(`Delete draft popcycle "${title}"? This cannot be undone.`)) return;

    setError(null);
    startTransition(async () => {
      const result = await deletePopcycle(popcycleId);
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
        onClick={handleDelete}
        disabled={isPending}
        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? "..." : "Delete"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
