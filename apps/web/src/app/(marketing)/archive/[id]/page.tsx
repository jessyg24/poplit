import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@poplit/core/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: popcycle } = await supabase
    .from("popcycles")
    .select("*")
    .eq("id", id)
    .eq("status", "completed")
    .single();

  if (!popcycle) notFound();

  // Get top stories for this popcycle, ordered by final score
  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, hook, genre, final_score, author_id, users!author_id(pen_name, avatar_url)")
    .eq("popcycle_id", id)
    .eq("status", "published")
    .order("final_score", { ascending: false })
    .limit(20);

  const placements = ["1st Place", "2nd Place", "3rd Place"];
  const placementColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <Link
        href="/archive"
        className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
      >
        &larr; Back to Archive
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            {popcycle.format}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {new Date(popcycle.popoff_at).toLocaleDateString()}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
          {popcycle.title}
        </h1>
        {popcycle.prompt_theme && (
          <p className="mt-2 text-[var(--color-text-secondary)]">
            {popcycle.prompt_theme}
          </p>
        )}
        <p className="mt-3 text-sm font-medium text-slate-600">
          Prize Pool: {formatCents(popcycle.prize_pool_cents)}
        </p>
      </div>

      {/* Results */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Results</h2>
        {!stories?.length ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No stories found for this Popcycle.
          </p>
        ) : (
          <div className="space-y-2">
            {stories.map((story: any, i: number) => {
              const author = story.users as { pen_name: string; avatar_url: string | null } | null;
              return (
                <div
                  key={story.id}
                  className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <span className="text-lg font-extrabold text-slate-300 w-8 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold truncate">{story.title}</h3>
                      {i < 3 && (
                        <span className={`text-xs font-semibold ${placementColors[i]}`}>
                          {placements[i]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      by {author?.pen_name ?? "Unknown"}{" "}
                      {story.final_score != null && (
                        <span className="ml-1">
                          &middot; Score: {story.final_score.toFixed(1)}
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/story/${story.id}`}
                    className="shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
                  >
                    Read
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
