import { createAdminClient } from "@/lib/supabase/admin";
import { BadgeForm } from "./form";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BadgesPage() {
  const admin = createAdminClient();

  const { data: badges, error } = await admin
    .from("badges")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading badges: {error.message}</p>;
  }

  // Get award counts per badge
  const badgeIds = (badges ?? []).map((b) => b.id);
  const { data: awardData } = badgeIds.length > 0
    ? await admin.from("user_badges").select("badge_id").in("badge_id", badgeIds)
    : { data: [] };
  const awardCounts: Record<string, number> = {};
  (awardData ?? []).forEach((ub) => {
    awardCounts[ub.badge_id] = (awardCounts[ub.badge_id] ?? 0) + 1;
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Badges</h1>

      {/* Create new badge */}
      <div className="mb-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Create New Badge</h2>
        <BadgeForm />
      </div>

      {/* Badge list */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(badges ?? []).map((badge) => (
          <div
            key={badge.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-lg">
                {badge.icon.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text)]">{badge.name}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{badge.description}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>Icon: {badge.icon}</span>
              <span>{awardCounts[badge.id] ?? 0} awarded</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Created {formatDate(badge.created_at)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)] font-mono">
              Criteria: {JSON.stringify(badge.criteria)}
            </p>
          </div>
        ))}
        {(badges ?? []).length === 0 && (
          <div className="col-span-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
            No badges created yet.
          </div>
        )}
      </div>
    </div>
  );
}
