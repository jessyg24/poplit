import { createAdminClient } from "@/lib/supabase/admin";
import { PRIZE_DISTRIBUTION } from "@poplit/core/constants";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function PayoutsPage() {
  const admin = createAdminClient();

  const { data: popcycles, error } = await admin
    .from("popcycles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading payout data: {error.message}</p>;
  }

  // Compute totals
  const totalPrizePool = (popcycles ?? []).reduce((sum, pc) => sum + pc.prize_pool_cents, 0);
  const totalEntryFees = (popcycles ?? []).reduce((sum, pc) => sum + pc.prize_pool_cents, 0); // TODO: Track entry fees separately
  const platformRevenue = Math.round(totalEntryFees * (PRIZE_DISTRIBUTION.platformPct / 100));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Revenue & Payouts</h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Entry Fees</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{formatCents(totalEntryFees)}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">TODO: Compute from Stripe data</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Prize Pools</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{formatCents(totalPrizePool)}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Platform Revenue ({PRIZE_DISTRIBUTION.platformPct}%)</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">{formatCents(platformRevenue)}</p>
        </div>
      </div>

      {/* Per-popcycle breakdown */}
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Per-Popcycle Breakdown</h2>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Popcycle</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Prize Pool</th>
              <th className="px-4 py-3 font-medium">Winner ({PRIZE_DISTRIBUTION.winnerPct}%)</th>
              <th className="px-4 py-3 font-medium">Runner-Up ({PRIZE_DISTRIBUTION.runnerUpPct}%)</th>
              <th className="px-4 py-3 font-medium">Wildcard ({PRIZE_DISTRIBUTION.wildcardPct}%)</th>
              <th className="px-4 py-3 font-medium">Platform ({PRIZE_DISTRIBUTION.platformPct}%)</th>
              <th className="px-4 py-3 font-medium">Pop-Off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(popcycles ?? []).map((pc) => {
              const pool = pc.prize_pool_cents;
              return (
                <tr key={pc.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{pc.title}</td>
                  <td className="px-4 py-3 capitalize text-[var(--color-text-secondary)]">
                    {pc.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">{formatCents(pool)}</td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">
                    {formatCents(Math.round(pool * (pc.winner_pct / 100)))}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">
                    {formatCents(Math.round(pool * (pc.runner_up_pct / 100)))}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">
                    {formatCents(Math.round(pool * (pc.wildcard_pct / 100)))}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-primary)]">
                    {formatCents(Math.round(pool * (PRIZE_DISTRIBUTION.platformPct / 100)))}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(pc.popoff_at)}</td>
                </tr>
              );
            })}
            {(popcycles ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No popcycles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
