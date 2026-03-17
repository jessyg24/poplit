"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@poplit/core/types";
import { useRouter } from "next/navigation";

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function BadgeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [criteria, setCriteria] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let parsedCriteria;
    try {
      parsedCriteria = JSON.parse(criteria);
    } catch {
      setError("Invalid JSON for criteria");
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    const { error: insertError } = await supabase.from("badges").insert({
      name,
      description,
      icon,
      criteria: parsedCriteria,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setName("");
    setDescription("");
    setIcon("");
    setCriteria("{}");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Badge name"
          required
          className={fieldClass}
        />
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Icon name (e.g., trophy, star)"
          required
          className={fieldClass}
        />
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        required
        className={fieldClass}
      />
      <textarea
        value={criteria}
        onChange={(e) => setCriteria(e.target.value)}
        placeholder='Criteria JSON (e.g., {"stories_read": 10})'
        className={fieldClass}
        rows={2}
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating..." : "Create Badge"}
      </button>
    </form>
  );
}
