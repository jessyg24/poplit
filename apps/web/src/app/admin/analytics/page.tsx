import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsCharts } from "./charts";

export default async function AnalyticsPage() {
  const admin = createAdminClient();

  // Gather aggregate metrics
  const [usersRes, storiesRes, popsRes, popcyclesRes] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("stories").select("id", { count: "exact", head: true }),
    admin.from("pops").select("id", { count: "exact", head: true }),
    admin.from("popcycles").select("id", { count: "exact", head: true }),
  ]);

  // Role breakdown
  const [usersRoleRes, adminsRes] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }).eq("role", "user"),
    admin.from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
  ]);

  // Story status breakdown
  const [approvedRes, pendingRes, flaggedRes, rejectedRes, publishedRes] = await Promise.all([
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "ai_flagged"),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  const metrics = {
    totalUsers: usersRes.count ?? 0,
    users: usersRoleRes.count ?? 0,
    admins: adminsRes.count ?? 0,
    totalStories: storiesRes.count ?? 0,
    approved: approvedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    flagged: flaggedRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
    published: publishedRes.count ?? 0,
    totalPops: popsRes.count ?? 0,
    totalPopcycles: popcyclesRes.count ?? 0,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Platform Analytics</h1>

      {/* Top-level metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Users" value={metrics.totalUsers} />
        <MetricCard label="Total Stories" value={metrics.totalStories} />
        <MetricCard label="Total Pops" value={metrics.totalPops} />
        <MetricCard label="Total Popcycles" value={metrics.totalPopcycles} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* User breakdown */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">User Breakdown</h2>
          <div className="space-y-3">
            <BarRow label="Users" value={metrics.users} total={metrics.totalUsers} color="bg-blue-500" />
            <BarRow label="Admins" value={metrics.admins} total={metrics.totalUsers} color="bg-orange-500" />
          </div>
        </div>

        {/* Story status breakdown */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Story Pipeline</h2>
          <div className="space-y-3">
            <BarRow label="Published" value={metrics.published} total={metrics.totalStories} color="bg-blue-500" />
            <BarRow label="Approved" value={metrics.approved} total={metrics.totalStories} color="bg-green-500" />
            <BarRow label="Pending Review" value={metrics.pending} total={metrics.totalStories} color="bg-yellow-500" />
            <BarRow label="AI Flagged" value={metrics.flagged} total={metrics.totalStories} color="bg-red-500" />
            <BarRow label="Rejected" value={metrics.rejected} total={metrics.totalStories} color="bg-red-700" />
          </div>
        </div>
      </div>

      {/* Time-series charts */}
      <div className="mt-8">
        <AnalyticsCharts />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">{value.toLocaleString()}</p>
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text)]">{label}</span>
        <span className="text-[var(--color-text-secondary)]">
          {value.toLocaleString()} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-[var(--color-border)]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
    </div>
  );
}
