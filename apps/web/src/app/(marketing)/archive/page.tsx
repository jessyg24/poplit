import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@poplit/core/utils";
import Link from "next/link";

export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: popcycles } = await supabase
    .from("popcycles")
    .select("*")
    .eq("status", "completed")
    .order("popoff_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">Archive</h1>
      <p className="text-lg text-[var(--color-text-secondary)] text-center mb-12">
        Browse past Popcycles and their winning stories.
      </p>

      {!popcycles?.length ? (
        <p className="text-center text-[var(--color-text-secondary)]">
          No completed Popcycles yet. The first one is coming soon!
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {popcycles.map((pc) => (
            <div
              key={pc.id}
              className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {pc.format}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {new Date(pc.popoff_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-1">{pc.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">{pc.prompt}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Prize Pool: {formatCents(pc.prize_pool_cents)}
                </span>
                <Link
                  href={`/archive/${pc.id}`}
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  View Results →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
