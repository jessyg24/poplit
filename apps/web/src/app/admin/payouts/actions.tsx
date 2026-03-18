"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initiatePayoutForPopcycle } from "../actions";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface PayoutActionsProps {
  popcycleId: string;
  status: string;
  storyCount: number;
}

export function PayoutActions({ popcycleId, status, storyCount }: PayoutActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<{
    totalRevenueCents: number;
    prizePoolCents: number;
    houseCutCents: number;
    firstCents: number;
    secondCents: number;
    thirdCents: number;
    storyCount: number;
  } | null>(null);
  const [initiated, setInitiated] = useState(false);

  if (status !== "completed") {
    return (
      <span className="text-xs text-[var(--color-text-secondary)]">
        {status === "popoff" ? "Awaiting completion" : "-"}
      </span>
    );
  }

  if (initiated && breakdown) {
    return (
      <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        Initiated
      </span>
    );
  }

  function handleInitiate() {
    if (storyCount === 0) {
      setError("No published stories in this popcycle.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await initiatePayoutForPopcycle(popcycleId);
      if (result.error) {
        setError(result.error);
      } else if (result.breakdown) {
        setBreakdown(result.breakdown);
        setInitiated(true);
        router.refresh();
      }
    });
  }

  return (
    <div>
      {breakdown && !initiated && (
        <div className="mb-2 rounded border border-green-200 bg-green-50 p-2 text-xs text-green-800">
          <p>Revenue: {formatCents(breakdown.totalRevenueCents)}</p>
          <p>Pool: {formatCents(breakdown.prizePoolCents)}</p>
          <p>1st: {formatCents(breakdown.firstCents)} | 2nd: {formatCents(breakdown.secondCents)} | 3rd: {formatCents(breakdown.thirdCents)}</p>
          <p>House: {formatCents(breakdown.houseCutCents)}</p>
        </div>
      )}
      <button
        onClick={handleInitiate}
        disabled={isPending}
        className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Calculating..." : "Initiate Payout"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
