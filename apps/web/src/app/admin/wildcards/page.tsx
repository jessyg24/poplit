import { createAdminClient } from "@/lib/supabase/admin";

export default async function WildcardsPage() {
  const admin = createAdminClient();

  // Fetch active popcycles in reading or popoff phase
  const { data: activePopcycles } = await admin
    .from("popcycles")
    .select("id, title, status")
    .in("status", ["reading_open", "popoff"])
    .order("popoff_at", { ascending: true });

  // For each active popcycle, get stories that are not in top positions but showing strong velocity
  // TODO: Implement real velocity metrics (pops per hour, acceleration, etc.)
  const wildcardCandidates: Array<{
    popcycleTitle: string;
    storyId: string;
    storyTitle: string;
    author: string;
    totalReaders: number;
    completionRate: number;
    rank: number | null;
  }> = [];

  for (const pc of activePopcycles ?? []) {
    const { data: scores } = await admin
      .from("scores")
      .select("*")
      .eq("popcycle_id", pc.id)
      .order("rank", { ascending: true });

    // Get stories not in top 3 but with decent completion rates
    const candidates = (scores ?? []).filter(
      (s) => (s.rank ?? 999) > 3 && s.completion_rate > 0.5
    ).slice(0, 5);

    if (candidates.length > 0) {
      const storyIds = candidates.map((c) => c.story_id);
      const { data: stories } = await admin
        .from("stories")
        .select("id, title, author_id")
        .in("id", storyIds);

      const authorIds = [...new Set((stories ?? []).map((s) => s.author_id))];
      const { data: authors } = authorIds.length > 0
        ? await admin.from("users").select("id, pen_name").in("id", authorIds)
        : { data: [] };
      const authorMap: Record<string, string> = {};
      (authors ?? []).forEach((a) => { authorMap[a.id] = a.pen_name; });
      const storyMap: Record<string, { title: string; author_id: string }> = {};
      (stories ?? []).forEach((s) => { storyMap[s.id] = { title: s.title, author_id: s.author_id }; });

      candidates.forEach((c) => {
        const story = storyMap[c.story_id];
        wildcardCandidates.push({
          popcycleTitle: pc.title,
          storyId: c.story_id,
          storyTitle: story?.title ?? "Unknown",
          author: story ? (authorMap[story.author_id] ?? "Unknown") : "Unknown",
          totalReaders: c.total_readers,
          completionRate: c.completion_rate,
          rank: c.rank,
        });
      });
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Wildcard Pool</h1>

      {/* Velocity metrics placeholder */}
      <div className="mb-4 rounded-md border border-[var(--color-accent)] bg-purple-50 p-3 text-sm text-purple-700">
        {/* TODO: Implement real-time velocity tracking - pops/hour, acceleration, momentum score */}
        Velocity metrics are a placeholder. Implement real-time pop velocity tracking for accurate wildcard selection.
      </div>

      {wildcardCandidates.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
          No wildcard candidates at this time. Candidates appear during active reading/popoff phases.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Popcycle</th>
                <th className="px-4 py-3 font-medium">Story</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Current Rank</th>
                <th className="px-4 py-3 font-medium">Readers</th>
                <th className="px-4 py-3 font-medium">Completion</th>
                <th className="px-4 py-3 font-medium">Velocity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {wildcardCandidates.map((c) => (
                <tr key={c.storyId} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{c.popcycleTitle}</td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{c.storyTitle}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{c.author}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">#{c.rank ?? "-"}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{c.totalReaders}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{(c.completionRate * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] italic">
                    {/* TODO: Real velocity metric */}
                    N/A
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
