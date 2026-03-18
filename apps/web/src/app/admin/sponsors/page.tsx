import { createAdminClient } from "@/lib/supabase/admin";
import { EditSponsorButton, RemoveSponsorButton } from "./actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function SponsorsPage() {
  const admin = createAdminClient();

  const { data: sponsored, error } = await admin
    .from("popcycles")
    .select("*")
    .eq("format", "sponsored")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading sponsored popcycles: {error.message}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Sponsored Popcycles</h1>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Sponsored</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{(sponsored ?? []).length}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Active</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">
            {(sponsored ?? []).filter((s) => !["completed", "draft"].includes(s.status)).length}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Sponsored Prize Pools</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">
            {formatCents((sponsored ?? []).reduce((sum, s) => sum + s.prize_pool_cents, 0))}
          </p>
        </div>
      </div>

      {(sponsored ?? []).length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
          No sponsored popcycles yet. Create one from the Popcycles page with format &quot;sponsored&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {(sponsored ?? []).map((pc) => (
            <div
              key={pc.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">{pc.title}</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{pc.prompt}</p>
                </div>
                <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  {pc.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Sponsor</p>
                  <div className="mt-1 flex items-center gap-2">
                    {pc.sponsor_logo_url && (
                      <img src={pc.sponsor_logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                    )}
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {pc.sponsor_name ?? "No sponsor set"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Prize Pool</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{formatCents(pc.prize_pool_cents)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Entry Fee</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{formatCents(pc.entry_fee_cents)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Pop-Off</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{formatDate(pc.popoff_at)}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-2 border-t border-[var(--color-border)] pt-3">
                <EditSponsorButton
                  popcycleId={pc.id}
                  currentName={pc.sponsor_name}
                  currentLogoUrl={pc.sponsor_logo_url}
                />
                <RemoveSponsorButton
                  popcycleId={pc.id}
                  sponsorName={pc.sponsor_name}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
