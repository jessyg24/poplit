import { createClient } from "@/lib/supabase/server";
import { getActivePopcycle, getScoresByPopcycle } from "@poplit/core/queries";
import { formatCents } from "@poplit/core/utils";
import { PRIZE_DISTRIBUTION } from "@poplit/core/constants";
import { PopoffReveal } from "./popoff-reveal";

export default async function PopoffPage() {
  const supabase = await createClient();

  // Get the most recent popcycle (active or completed)
  const { data: activePopcycle } = await getActivePopcycle(supabase);

  // Also check for completed popcycles with popoff results
  const { data: recentPopcycles } = await supabase
    .from("popcycles")
    .select("*")
    .in("status", ["popoff", "completed", "submissions_open", "reading_open"])
    .order("popoff_at", { ascending: false })
    .limit(1);

  const popcycle = recentPopcycles?.[0] ?? activePopcycle;

  if (!popcycle) {
    return (
      <div className="text-center py-24">
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">
          No Popoff Scheduled
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Check back when a Popcycle is active.
        </p>
      </div>
    );
  }

  const isPopoffTime =
    popcycle.status === "popoff" || popcycle.status === "completed";
  const popoffDate = new Date(popcycle.popoff_at);
  const now = new Date();
  const isPast = popoffDate <= now;

  // Get top stories if popoff is happening/complete
  let topStories: Array<{
    rank: number;
    title: string;
    penName: string;
    displayScore: number;
    completionRate: number;
  }> = [];

  if (isPopoffTime || isPast) {
    const { data: scores } = await getScoresByPopcycle(supabase, popcycle.id);
    if (scores) {
      topStories = scores.slice(0, 3).map((s: any, i: number) => ({
        rank: i + 1,
        title:
          (s.stories as Record<string, unknown>)?.title as string ?? "Unknown",
        penName:
          ((s.stories as Record<string, unknown>)?.users as Record<string, unknown>)?.pen_name as string ?? "unknown",
        displayScore: s.display_score,
        completionRate: s.completion_rate,
      }));
    }
  }

  const prizePool = popcycle.prize_pool_cents;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 lg:pb-0">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {popcycle.title}{" "}
          <span className="text-[var(--color-primary)]">Popoff</span>
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {popcycle.prompt}
        </p>
      </div>

      {/* Countdown or Results */}
      {!isPopoffTime && !isPast ? (
        <PopoffCountdown popoffAt={popcycle.popoff_at} />
      ) : (
        <PopoffReveal topStories={topStories} prizePool={prizePool} />
      )}

      {/* Prize breakdown */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-lg font-bold mb-4">Prize Pool</h2>
        <div className="text-center mb-4">
          <span className="text-3xl font-extrabold text-[var(--color-primary)]">
            {formatCents(prizePool)}
          </span>
        </div>
        <div className="space-y-3">
          {[
            {
              label: "1st Place",
              pct: PRIZE_DISTRIBUTION.winnerPct,
              color: "text-yellow-500",
            },
            {
              label: "2nd Place",
              pct: PRIZE_DISTRIBUTION.runnerUpPct,
              color: "text-gray-400",
            },
            {
              label: "Wildcard",
              pct: PRIZE_DISTRIBUTION.wildcardPct,
              color: "text-amber-600",
            },
          ].map(({ label, pct, color }) => (
            <div
              key={label}
              className="flex items-center justify-between text-sm"
            >
              <span className={`font-semibold ${color}`}>{label}</span>
              <span className="text-[var(--color-text-secondary)]">
                {pct}% &middot; {formatCents(Math.floor((prizePool * pct) / 100))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PopoffCountdown({ popoffAt }: { popoffAt: string }) {
  const target = new Date(popoffAt);
  const now = new Date();
  const diffMs = Math.max(0, target.getTime() - now.getTime());

  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  const seconds = Math.floor((diffMs % 60_000) / 1_000);

  const segments = [
    { value: days, label: "Days" },
    { value: hours, label: "Hours" },
    { value: minutes, label: "Min" },
    { value: seconds, label: "Sec" },
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
      <h2 className="text-center text-lg font-bold mb-6">Popoff In</h2>
      <div className="flex items-center justify-center gap-4">
        {segments.map(({ value, label }) => (
          <div key={label} className="text-center">
            <div className="text-4xl font-extrabold tabular-nums">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-1 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              {label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">
        Countdown is approximate. Refresh for updated time.
      </p>
    </div>
  );
}
