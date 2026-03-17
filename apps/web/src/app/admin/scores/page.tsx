import { createAdminClient } from "@/lib/supabase/admin";

interface Props {
  searchParams: Promise<{ popcycle?: string }>;
}

export default async function ScoresPage({ searchParams }: Props) {
  const params = await searchParams;
  const admin = createAdminClient();

  // Fetch popcycles for filter dropdown
  const { data: popcycles } = await admin
    .from("popcycles")
    .select("id, title, status")
    .order("created_at", { ascending: false });

  const selectedPopcycle = params.popcycle ?? (popcycles?.[0]?.id ?? "");

  // Fetch scores for selected popcycle
  let scores: Record<string, any>[] | null = [];
  if (selectedPopcycle) {
    const { data } = await admin
      .from("scores")
      .select("*")
      .eq("popcycle_id", selectedPopcycle)
      .order("rank", { ascending: true });
    scores = data;
  }

  // Fetch story titles
  const storyIds = (scores ?? []).map((s: Record<string, any>) => s.story_id);
  const { data: stories } = storyIds.length > 0
    ? await admin.from("stories").select("id, title, author_id").in("id", storyIds)
    : { data: [] };
  const storyMap: Record<string, { title: string; author_id: string }> = {};
  (stories ?? []).forEach((s) => { storyMap[s.id] = { title: s.title, author_id: s.author_id }; });

  // Fetch authors
  const authorIds = [...new Set((stories ?? []).map((s) => s.author_id))];
  const { data: authors } = authorIds.length > 0
    ? await admin.from("users").select("id, pen_name").in("id", authorIds)
    : { data: [] };
  const authorMap: Record<string, string> = {};
  (authors ?? []).forEach((a) => { authorMap[a.id] = a.pen_name; });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Scoring Oversight</h1>

      {/* Popcycle selector */}
      <form method="GET" className="mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="popcycle" className="text-sm font-medium text-[var(--color-text)]">Popcycle:</label>
          <select
            name="popcycle"
            id="popcycle"
            defaultValue={selectedPopcycle}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {(popcycles ?? []).map((pc) => (
              <option key={pc.id} value={pc.id}>
                {pc.title} ({pc.status.replace(/_/g, " ")})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            View
          </button>
        </div>
      </form>

      {/* Anomaly detection placeholder */}
      <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-700">
        {/* TODO: Implement anomaly detection - flag scores with unusual patterns */}
        Anomaly detection: No anomalies detected. (Placeholder - implement statistical outlier detection)
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Story</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Raw Score</th>
              <th className="px-4 py-3 font-medium">Display Score</th>
              <th className="px-4 py-3 font-medium">Readers</th>
              <th className="px-4 py-3 font-medium">Completion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(scores ?? []).map((score: Record<string, any>) => {
              const story = storyMap[score.story_id];
              return (
                <tr key={score.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                    {score.rank ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                    {story?.title ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {story ? (authorMap[story.author_id] ?? "Unknown") : "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)] font-mono">{score.raw_score.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--color-text)] font-mono">{score.display_score.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{score.total_readers}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{(score.completion_rate * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
            {(scores ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No scores for this popcycle yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
