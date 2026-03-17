import { createAdminClient } from "@/lib/supabase/admin";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function WatchlistPage() {
  const admin = createAdminClient();

  const { data: users, error } = await admin
    .from("users")
    .select("id, pen_name, email, watch_list_reason, created_at, updated_at")
    .eq("watch_list", true)
    .order("updated_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading watchlist: {error.message}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Watchlist</h1>

      {(users ?? []).length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
          No users on the watchlist.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Pen Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {(users ?? []).map((user) => (
                <tr key={user.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{user.pen_name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{user.email}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{user.watch_list_reason ?? "No reason given"}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(user.updated_at)}</td>
                  <td className="px-4 py-3">
                    {/* TODO: Implement remove from watchlist action */}
                    <button className="text-xs text-red-600 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
