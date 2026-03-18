"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Database, StoryStatus } from "@poplit/core/types";
import { useRouter } from "next/navigation";

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface Props {
  storyId: string;
  currentStatus: StoryStatus;
  aiDisclaimer?: boolean;
}

export function AiReviewActions({ storyId, currentStatus, aiDisclaimer = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [disclaimerOn, setDisclaimerOn] = useState(aiDisclaimer);

  async function handleApprove() {
    setLoading(true);
    const supabase = getSupabase();
    await supabase
      .from("stories")
      .update({ status: "approved", ai_flagged: false })
      .eq("id", storyId);
    router.refresh();
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    const supabase = getSupabase();
    await supabase
      .from("stories")
      .update({ status: "rejected", ai_review_note: reason })
      .eq("id", storyId);
    router.refresh();
  }

  async function handleToggleDisclaimer() {
    setLoading(true);
    const supabase = getSupabase();
    const newVal = !disclaimerOn;
    await supabase
      .from("stories")
      .update({ ai_disclaimer: newVal })
      .eq("id", storyId);
    setDisclaimerOn(newVal);
    setLoading(false);
    router.refresh();
  }

  if (currentStatus === "approved" || currentStatus === "rejected") {
    return (
      <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
        Already {currentStatus}.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => setShowReject(!showReject)}
          disabled={loading}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={handleToggleDisclaimer}
          disabled={loading}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            disclaimerOn
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          {disclaimerOn ? "Remove AI Badge" : "Add AI Badge"}
        </button>
      </div>

      {showReject && (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={3}
          />
          <button
            onClick={handleReject}
            disabled={loading || !reason.trim()}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      )}
    </div>
  );
}
