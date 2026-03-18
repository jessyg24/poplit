import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@poplit/core/types";
import { EditRoleButton, AddCreditsButton, IssueStrikeButton, ToggleWatchlistButton } from "./actions";

const roleColors: Record<UserRole, string> = {
  user: "bg-blue-100 text-blue-700",
  admin: "bg-orange-100 text-orange-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q ?? "";
  const admin = createAdminClient();

  let dbQuery = admin
    .from("users")
    .select("id, pen_name, email, role, entry_credits, created_at, watch_list")
    .order("created_at", { ascending: false })
    .limit(100);

  if (query) {
    dbQuery = dbQuery.or(`pen_name.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const { data: users, error } = await dbQuery;

  if (error) {
    return <p className="text-red-500">Error loading users: {error.message}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Users</h1>

      {/* Search */}
      <form method="GET" className="mb-4">
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by pen name or email..."
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Pen Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Credits</th>
              <th className="px-4 py-3 font-medium">Watchlist</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(users ?? []).map((user) => (
              <tr key={user.id} className="hover:bg-[var(--color-surface)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">{user.pen_name}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role as UserRole]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-text)]">{user.entry_credits ?? 0}</td>
                <td className="px-4 py-3">
                  {user.watch_list && (
                    <span className="inline-block rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                      watched
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <EditRoleButton userId={user.id} currentRole={user.role as UserRole} />
                    <AddCreditsButton userId={user.id} penName={user.pen_name} />
                    <IssueStrikeButton userId={user.id} penName={user.pen_name} />
                    <ToggleWatchlistButton userId={user.id} isWatched={user.watch_list} />
                  </div>
                </td>
              </tr>
            ))}
            {(users ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
