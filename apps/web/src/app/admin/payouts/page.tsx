import { createAdminClient } from "@/lib/supabase/admin";
import { PRIZE_DISTRIBUTION } from "@poplit/core/constants";
import { PayoutActions } from "./actions";

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

  // Get published story counts per popcycle for revenue calculation
  const popcycleIds = (popcycles ?? []).map((p) => p.id);
  const { data: stories } = popcycleIds.length > 0
    ? await admin
        .from("stories")
        .select("popcycle_id")
        .in("popcycle_id", popcycleIds)
        .eq("status", "published")
    : { data: [] };

  const storyCountMap: Record<string, number> = {};
  (stories ?? []).forEach((s) => {
    storyCountMap[s.popcycle_id] = (storyCountMap[s.popcycle_id] ?? 0) + 1;
  });

  // Compute real revenue based on entry_fee_cents * published story count
  let totalRevenue = 0;
  let totalPrizePool = 0;
  let totalHouseCut = 0;

  const enriched = (popcycles ?? []).map((pc) => {
    const count = storyCountMap[pc.id] ?? 0;
    const revenue = pc.entry_fee_cents * count;
    const houseCut = Math.round(revenue * (pc.house_pct / 100));
    const prizePool = revenue - houseCut;

    totalRevenue += revenue;
    totalPrizePool += prizePool;
    totalHouseCut += houseCut;

    return { ...pc, storyCount: count, revenue, houseCut, prizePool };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Revenue & Payouts</h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Entry Revenue</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{formatCents(totalRevenue)}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {(stories ?? []).length} published stories
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Prize Pools</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{formatCents(totalPrizePool)}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">House Revenue</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">{formatCents(totalHouseCut)}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Popcycles</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{(popcycles ?? []).length}</p>
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
              <th className="px-4 py-3 font-medium">Stories</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">1st ({PRIZE_DISTRIBUTION.firstPct}%)</th>
              <th className="px-4 py-3 font-medium">2nd ({PRIZE_DISTRIBUTION.secondPct}%)</th>
              <th className="px-4 py-3 font-medium">3rd ({PRIZE_DISTRIBUTION.thirdPct}%)</th>
              <th className="px-4 py-3 font-medium">House ({PRIZE_DISTRIBUTION.housePct}%)</th>
              <th className="px-4 py-3 font-medium">Pop-Off</th>
              <th className="px-4 py-3 font-medium">Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {enriched.map((pc) => {
              const distribTotal = pc.first_pct + pc.second_pct + pc.third_pct;
              const firstAmt = distribTotal > 0 ? Math.round(pc.prizePool * (pc.first_pct / distribTotal)) : 0;
              const secondAmt = distribTotal > 0 ? Math.round(pc.prizePool * (pc.second_pct / distribTotal)) : 0;
              const thirdAmt = distribTotal > 0 ? pc.prizePool - firstAmt - secondAmt : 0;

              return (
                <tr key={pc.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{pc.title}</td>
                  <td className="px-4 py-3 capitalize text-[var(--color-text-secondary)]">
                    {pc.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{pc.storyCount}</td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">{formatCents(pc.revenue)}</td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">{formatCents(firstAmt)}</td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">{formatCents(secondAmt)}</td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">{formatCents(thirdAmt)}</td>
                  <td className="px-4 py-3 font-mono text-[var(--color-primary)]">{formatCents(pc.houseCut)}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(pc.popoff_at)}</td>
                  <td className="px-4 py-3">
                    <PayoutActions popcycleId={pc.id} status={pc.status} storyCount={pc.storyCount} />
                  </td>
                </tr>
              );
            })}
            {enriched.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
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
