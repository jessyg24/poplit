import { createAdminClient } from "@/lib/supabase/admin";
import { ViewTopStoriesButton, RemoveFromAnthologyButton } from "./actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AnthologyPage() {
  const admin = createAdminClient();

  const { data: entries, error } = await admin
    .from("anthology_entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading anthology entries: {error.message}</p>;
  }

  // Fetch story and popcycle details
  const storyIds = (entries ?? []).map((e) => e.story_id);
  const popcycleIds = [...new Set((entries ?? []).map((e) => e.popcycle_id))];

  const [storiesRes, popcyclesRes] = await Promise.all([
    storyIds.length > 0
      ? admin.from("stories").select("id, title, author_id").in("id", storyIds)
      : Promise.resolve({ data: [] }),
    popcycleIds.length > 0
      ? admin.from("popcycles").select("id, title").in("id", popcycleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const storyMap: Record<string, { title: string; author_id: string }> = {};
  (storiesRes.data ?? []).forEach((s) => { storyMap[s.id] = { title: s.title, author_id: s.author_id }; });

  const popcycleMap: Record<string, string> = {};
  (popcyclesRes.data ?? []).forEach((p) => { popcycleMap[p.id] = p.title; });

  // Fetch authors
  const authorIds = [...new Set((storiesRes.data ?? []).map((s) => s.author_id))];
  const { data: authors } = authorIds.length > 0
    ? await admin.from("users").select("id, pen_name").in("id", authorIds)
    : { data: [] };
  const authorMap: Record<string, string> = {};
  (authors ?? []).forEach((a) => { authorMap[a.id] = a.pen_name; });

  // Group by quarter
  const quarters = new Map<string, typeof entries>();
  (entries ?? []).forEach((entry) => {
    const list = quarters.get(entry.quarter) ?? [];
    list.push(entry);
    quarters.set(entry.quarter, list);
  });

  // Get recent completed popcycles for selection
  const { data: completedPc } = await admin
    .from("popcycles")
    .select("id, title")
    .eq("status", "completed")
    .order("popoff_at", { ascending: false })
    .limit(5);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Anthology Selections</h1>

      {/* Selection panel */}
      <div className="mb-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Select Stories for Anthology</h2>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          Choose from recent completed popcycles to add winners to the quarterly anthology.
        </p>
        {(completedPc ?? []).length > 0 ? (
          <div className="space-y-2">
            {(completedPc ?? []).map((pc) => (
              <div key={pc.id} className="flex items-center justify-between rounded-md bg-[var(--color-background)] p-3">
                <span className="text-sm font-medium text-[var(--color-text)]">{pc.title}</span>
                <ViewTopStoriesButton popcycleId={pc.id} popcycleTitle={pc.title} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">No completed popcycles available.</p>
        )}
      </div>

      {/* Past selections by quarter */}
      {quarters.size === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
          No anthology selections yet.
        </div>
      ) : (
        Array.from(quarters.entries()).map(([quarter, qEntries]) => (
          <div key={quarter} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">{quarter}</h2>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Story</th>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 font-medium">Popcycle</th>
                    <th className="px-4 py-3 font-medium">Selected</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {(qEntries ?? []).map((entry) => {
                    const story = storyMap[entry.story_id];
                    return (
                      <tr key={entry.id} className="hover:bg-[var(--color-surface)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                          {story?.title ?? "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {story ? (authorMap[story.author_id] ?? "Unknown") : "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {popcycleMap[entry.popcycle_id] ?? "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {formatDate(entry.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <RemoveFromAnthologyButton entryId={entry.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
