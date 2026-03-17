import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getStoriesByAuthor } from "@poplit/core/queries";
import type { Score } from "@poplit/core/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: stories } = await getStoriesByAuthor(supabase, user.id);

  const storiesWithScores = (stories ?? []).map((story: any) => {
    const score = ((story as Record<string, unknown>).scores as Score[] | null)?.[0] ?? null;
    return {
      id: story.id,
      title: story.title,
      status: story.status,
      genre: story.genre,
      createdAt: story.created_at,
      score: score?.display_score ?? 0,
      totalReaders: score?.total_readers ?? 0,
      completionRate: score?.completion_rate ?? 0,
      rank: score?.rank ?? null,
      section1Reads: score?.section_1_reads ?? 0,
      section2Reads: score?.section_2_reads ?? 0,
      section3Reads: score?.section_3_reads ?? 0,
      section4Reads: score?.section_4_reads ?? 0,
      section5Reads: score?.section_5_reads ?? 0,
    };
  });

  // Aggregate stats
  const totalPops = storiesWithScores.reduce(
    (sum: any, s: any) =>
      sum +
      s.section1Reads +
      s.section2Reads +
      s.section3Reads +
      s.section4Reads +
      s.section5Reads,
    0,
  );

  const avgCompletion =
    storiesWithScores.length > 0
      ? storiesWithScores.reduce((sum: any, s: any) => sum + s.completionRate, 0) /
        storiesWithScores.length
      : 0;

  const bestRank = storiesWithScores
    .filter((s: any) => s.rank !== null)
    .reduce(
      (best: any, s: any) => (s.rank !== null && (best === null || s.rank < best) ? s.rank : best),
      null as number | null,
    );

  const statCards = [
    { label: "Total Pops", value: totalPops.toLocaleString() },
    {
      label: "Avg Completion",
      value: `${(avgCompletion * 100).toFixed(1)}%`,
    },
    { label: "Stories Submitted", value: storiesWithScores.length.toString() },
    { label: "Best Rank", value: bestRank !== null ? `#${bestRank}` : "--" },
  ];

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Writer Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              {label}
            </p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      {/* Stories list */}
      <section>
        <h2 className="text-lg font-bold mb-4">Your Stories</h2>
        {storiesWithScores.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <p className="text-[var(--color-text-secondary)]">
              You haven&apos;t submitted any stories yet.
            </p>
            <a
              href="/submit"
              className="inline-block mt-3 px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Submit Your First Story
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {storiesWithScores.map((story: any) => (
              <a
                key={story.id}
                href={`/story/${story.id}`}
                className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold truncate">
                        {story.title}
                      </h3>
                      <StatusBadge status={story.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {story.genre} &middot;{" "}
                      {new Date(story.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold text-[var(--color-primary)]">
                      {story.score.toFixed(1)}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      score
                    </p>
                  </div>
                </div>

                {/* Section reads bar */}
                <div className="mt-4 grid grid-cols-5 gap-1.5">
                  {[
                    story.section1Reads,
                    story.section2Reads,
                    story.section3Reads,
                    story.section4Reads,
                    story.section5Reads,
                  ].map((reads, i) => {
                    const maxReads = Math.max(
                      story.section1Reads,
                      story.section2Reads,
                      story.section3Reads,
                      story.section4Reads,
                      story.section5Reads,
                      1,
                    );
                    const pct = (reads / maxReads) * 100;
                    return (
                      <div key={i} className="text-center">
                        <div className="h-12 bg-[var(--color-border)] rounded relative overflow-hidden">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-[var(--color-primary)] rounded transition-all"
                            style={{ height: `${pct}%`, opacity: 0.7 + (pct / 100) * 0.3 }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
                          S{i + 1}
                        </p>
                        <p className="text-[10px] font-semibold">{reads}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                  <span>{story.totalReaders} readers</span>
                  <span>
                    {(story.completionRate * 100).toFixed(0)}% completion
                  </span>
                  {story.rank !== null && <span>Rank #{story.rank}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published:
      "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300",
    draft: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    pending_review:
      "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300",
    ai_flagged: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
    approved:
      "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    rejected: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
    archived:
      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] ?? styles.draft}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
