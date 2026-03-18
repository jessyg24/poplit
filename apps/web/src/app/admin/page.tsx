import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardRevenue } from "./actions";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

function KpiCard({ label, value, subtext }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{value}</p>
      {subtext && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{subtext}</p>}
    </div>
  );
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient();

  const [
    usersRes,
    writersRes,
    storiesRes,
    pendingRes,
    reportsRes,
    strikesRes,
    popcyclesRes,
    revenueData,
  ] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("users").select("id", { count: "exact", head: true }).eq("role", "writer"),
    admin.from("stories").select("id", { count: "exact", head: true }),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("strikes").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("popcycles").select("id", { count: "exact", head: true }).in("status", ["submissions_open", "reading_open", "popoff"]),
    getDashboardRevenue(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Dashboard Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Users" value={usersRes.count ?? 0} />
        <KpiCard label="Active Writers" value={writersRes.count ?? 0} />
        <KpiCard
          label="Active Popcycles"
          value={popcyclesRes.count ?? 0}
          subtext="Submissions open, reading, or popoff"
        />
        <KpiCard label="Total Stories" value={storiesRes.count ?? 0} />
        <KpiCard
          label="Total Revenue"
          value={formatCents(revenueData.totalRevenueCents)}
          subtext="Sum of completed popcycle prize pools"
        />
        <KpiCard
          label="Active Prize Pool"
          value={formatCents(revenueData.activePrizePoolCents)}
          subtext="Sum of active popcycle pools"
        />
        <KpiCard label="Pending Reviews" value={pendingRes.count ?? 0} />
        <KpiCard label="Open Reports" value={reportsRes.count ?? 0} />
        <KpiCard label="Active Strikes" value={strikesRes.count ?? 0} />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/popcycles/create"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Create Popcycle
          </a>
          <a
            href="/admin/submissions"
            className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          >
            Review Submissions ({pendingRes.count ?? 0})
          </a>
          <a
            href="/admin/reports"
            className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          >
            Handle Reports ({reportsRes.count ?? 0})
          </a>
          <a
            href="/admin/ai-review"
            className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          >
            AI Review Queue
          </a>
          <a
            href="/admin/wildcards"
            className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          >
            Wildcards
          </a>
          <a
            href="/admin/anthology"
            className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          >
            Anthology
          </a>
          <a
            href="/admin/scores"
            className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          >
            Scores
          </a>
          <a
            href="/admin/payouts"
            className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          >
            Payouts
          </a>
        </div>
      </div>
    </div>
  );
}
