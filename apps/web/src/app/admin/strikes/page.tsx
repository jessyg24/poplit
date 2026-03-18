import { createAdminClient } from "@/lib/supabase/admin";
import type { StrikeStatus } from "@poplit/core/types";
import { IssueStrikeForm, ReverseStrikeButton, ExpireStrikeButton } from "./actions";

const statusColors: Record<StrikeStatus, string> = {
  active: "bg-red-100 text-red-700",
  appealed: "bg-yellow-100 text-yellow-700",
  reversed: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function StrikesPage() {
  const admin = createAdminClient();

  const { data: strikes, error } = await admin
    .from("strikes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading strikes: {error.message}</p>;
  }

  // Fetch user names
  const userIds = [...new Set((strikes ?? []).flatMap((s) => [s.user_id, s.issued_by]))];
  const { data: users } = userIds.length > 0
    ? await admin.from("users").select("id, pen_name").in("id", userIds)
    : { data: [] };
  const userMap: Record<string, string> = {};
  (users ?? []).forEach((u) => { userMap[u.id] = u.pen_name; });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Strikes</h1>
      </div>

      <IssueStrikeForm />

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Issued By</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(strikes ?? []).map((strike) => (
              <tr key={strike.id} className="hover:bg-[var(--color-surface)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                  {userMap[strike.user_id] ?? "Unknown"}
                </td>
                <td className="px-4 py-3 text-[var(--color-text)]">{strike.reason}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[strike.status as StrikeStatus]}`}>
                    {strike.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                  {userMap[strike.issued_by] ?? "System"}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(strike.created_at)}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                  {strike.expires_at ? formatDate(strike.expires_at) : "Never"}
                </td>
                <td className="px-4 py-3">
                  {strike.status === "active" && (
                    <div className="flex gap-2">
                      <ReverseStrikeButton strikeId={strike.id} />
                      <ExpireStrikeButton strikeId={strike.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {(strikes ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No strikes issued.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
