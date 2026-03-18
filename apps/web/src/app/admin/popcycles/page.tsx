import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PopcycleStatus } from "@poplit/core/types";
import { EditPopcycleButton, ChangeStatusButton, DeletePopcycleButton } from "./actions";

const statusColors: Record<PopcycleStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  submissions_open: "bg-green-100 text-green-700",
  reading_open: "bg-purple-100 text-purple-700",
  popoff: "bg-orange-100 text-orange-700",
  completed: "bg-gray-200 text-gray-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PopcyclesPage() {
  const admin = createAdminClient();

  const { data: popcycles, error } = await admin
    .from("popcycles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading popcycles: {error.message}</p>;
  }

  // Get entry counts per popcycle
  const popcycleIds = (popcycles ?? []).map((p) => p.id);
  const { data: storyCounts } = popcycleIds.length > 0
    ? await admin
        .from("stories")
        .select("popcycle_id")
        .in("popcycle_id", popcycleIds)
    : { data: [] };

  const countMap: Record<string, number> = {};
  (storyCounts ?? []).forEach((s) => {
    countMap[s.popcycle_id] = (countMap[s.popcycle_id] ?? 0) + 1;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Popcycles</h1>
        <Link
          href="/admin/popcycles/create"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Create New
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Format</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Entries</th>
              <th className="px-4 py-3 font-medium">Prize Pool</th>
              <th className="px-4 py-3 font-medium">Submissions</th>
              <th className="px-4 py-3 font-medium">Pop-Off</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(popcycles ?? []).map((pc) => (
              <tr key={pc.id} className="hover:bg-[var(--color-surface)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">{pc.title}</td>
                <td className="px-4 py-3 capitalize text-[var(--color-text-secondary)]">{pc.format}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[pc.status as PopcycleStatus]}`}>
                    {pc.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-text)]">{countMap[pc.id] ?? 0}</td>
                <td className="px-4 py-3 text-[var(--color-text)]">{formatCents(pc.prize_pool_cents)}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                  {formatDate(pc.submissions_open_at)} - {formatDate(pc.submissions_close_at)}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(pc.popoff_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EditPopcycleButton popcycle={pc} />
                    <ChangeStatusButton popcycleId={pc.id} currentStatus={pc.status as PopcycleStatus} />
                    <DeletePopcycleButton popcycleId={pc.id} status={pc.status as PopcycleStatus} title={pc.title} />
                  </div>
                </td>
              </tr>
            ))}
            {(popcycles ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No popcycles yet. Create your first one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
