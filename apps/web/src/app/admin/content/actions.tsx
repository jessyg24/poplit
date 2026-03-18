"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addGenre,
  removeGenre,
  addMood,
  removeMood,
  addTriggerWarning,
  removeTriggerWarning,
} from "../actions";

// ── Tag with Remove Button ──────────────────────────────────────────────

function Tag({
  label,
  colorClass,
  onRemove,
  isPending,
}: {
  label: string;
  colorClass: string;
  onRemove: () => void;
  isPending: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${colorClass}`}
    >
      {label}
      <button
        onClick={onRemove}
        disabled={isPending}
        className="ml-1 rounded-full p-0.5 hover:bg-black/10 disabled:opacity-50 transition-colors"
        title={`Remove ${label}`}
      >
        &times;
      </button>
    </span>
  );
}

// ── Add Input ───────────────────────────────────────────────────────────

function AddInput({
  placeholder,
  onAdd,
  isPending,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        disabled={isPending}
      />
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
      >
        Add
      </button>
    </form>
  );
}

// ── Main Content Manager ────────────────────────────────────────────────

interface ContentTaxonomy {
  genres: string[];
  moods: string[];
  triggerWarnings: string[];
}

export function ContentTaxonomyManager({
  initialTaxonomy,
}: {
  initialTaxonomy: ContentTaxonomy;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const taxonomy = initialTaxonomy;

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg });
    if (type === "success") {
      setTimeout(() => setFeedback(null), 2000);
    }
  }

  function handleAction(action: (value: string) => Promise<{ error?: string; success?: boolean }>, value: string, successMsg: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action(value);
      if (result.error) {
        showFeedback("error", result.error);
      } else {
        showFeedback("success", successMsg);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Content Management</h1>

      {feedback && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            feedback.type === "error"
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-green-300 bg-green-50 text-green-700"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Genre Taxonomy */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Genre Taxonomy</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Genres available for writers to tag their stories.
          </p>
          <div className="flex flex-wrap gap-2">
            {taxonomy.genres.map((genre) => (
              <Tag
                key={genre}
                label={genre}
                colorClass="bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)]"
                onRemove={() => handleAction(removeGenre, genre, `Removed genre: ${genre}`)}
                isPending={isPending}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{taxonomy.genres.length} genres</p>
          <AddInput
            placeholder="Add new genre..."
            onAdd={(v) => handleAction(addGenre, v, `Added genre: ${v}`)}
            isPending={isPending}
          />
        </div>

        {/* Moods */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Moods</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Story mood tags available for writers.
          </p>
          <div className="flex flex-wrap gap-2">
            {taxonomy.moods.map((mood) => (
              <Tag
                key={mood}
                label={mood}
                colorClass="bg-[var(--color-accent)] bg-opacity-10 text-[var(--color-accent)]"
                onRemove={() => handleAction(removeMood, mood, `Removed mood: ${mood}`)}
                isPending={isPending}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{taxonomy.moods.length} moods</p>
          <AddInput
            placeholder="Add new mood..."
            onAdd={(v) => handleAction(addMood, v, `Added mood: ${v}`)}
            isPending={isPending}
          />
        </div>

        {/* Trigger Warnings */}
        <div className="col-span-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Trigger Warnings</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Content warnings that writers can tag on their stories. Readers see these before opening a story.
          </p>
          <div className="flex flex-wrap gap-2">
            {taxonomy.triggerWarnings.map((tw) => (
              <Tag
                key={tw}
                label={tw}
                colorClass="bg-red-100 text-red-700"
                onRemove={() => handleAction(removeTriggerWarning, tw, `Removed trigger warning: ${tw}`)}
                isPending={isPending}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{taxonomy.triggerWarnings.length} trigger warnings</p>
          <AddInput
            placeholder="Add new trigger warning..."
            onAdd={(v) => handleAction(addTriggerWarning, v, `Added trigger warning: ${v}`)}
            isPending={isPending}
          />
        </div>
      </div>
    </div>
  );
}
