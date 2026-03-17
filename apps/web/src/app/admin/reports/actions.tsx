"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Database, ReportStatus } from "@poplit/core/types";
import { useRouter } from "next/navigation";

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface Props {
  reportId: string;
  currentStatus: ReportStatus;
}

export function ReportActions({ reportId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  async function updateStatus(status: ReportStatus, resolutionNote?: string) {
    setLoading(true);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("reports")
      .update({
        status,
        resolved_by: status === "resolved" || status === "dismissed" ? user?.id : null,
        resolved_at: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
        resolution_note: resolutionNote || null,
      })
      .eq("id", reportId);

    router.refresh();
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        {currentStatus === "open" && (
          <button
            onClick={() => updateStatus("investigating")}
            disabled={loading}
            className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            Investigate
          </button>
        )}
        <button
          onClick={() => setShowNote(true)}
          disabled={loading}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Resolve
        </button>
        <button
          onClick={() => updateStatus("dismissed")}
          disabled={loading}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] disabled:opacity-50 transition-colors"
        >
          Dismiss
        </button>
      </div>

      {showNote && (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Resolution note..."
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={2}
          />
          <button
            onClick={() => updateStatus("resolved", note)}
            disabled={loading}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Confirm Resolution"}
          </button>
        </div>
      )}
    </div>
  );
}
