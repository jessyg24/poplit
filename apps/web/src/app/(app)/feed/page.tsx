import { createClient } from "@/lib/supabase/server";
import {
  getActivePopcycle,
  getPublishedStories,
  getReaderPopsForStory,
} from "@poplit/core/queries";
import { truncateText } from "@poplit/core/utils";
import { colors } from "@poplit/ui";
import Link from "next/link";

const genreColors = colors.genre as Record<string, string>;

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: popcycle } = await getActivePopcycle(supabase);

  let stories: Array<
    Record<string, unknown> & {
      id: string;
      title: string;
      hook: string;
      genre: string;
      users: { pen_name: string; display_name: string | null; avatar_url: string | null } | null;
    }
  > = [];

  if (popcycle) {
    const { data } = await getPublishedStories(supabase, popcycle.id);
    stories = (data ?? []) as typeof stories;
  }

  // Get pop counts for each story
  const storiesWithPops = await Promise.all(
    stories.map(async (story) => {
      const { count } = await supabase
        .from("pops")
        .select("*", { count: "exact", head: true })
        .eq("story_id", story.id);
      return { ...story, popCount: count ?? 0 };
    }),
  );

  // Check for in-progress stories (user has pops but hasn't completed all 5 sections)
  let inProgress: typeof storiesWithPops = [];
  if (user) {
    const inProgressStories = await Promise.all(
      storiesWithPops.map(async (story) => {
        const { data: pops } = await getReaderPopsForStory(
          supabase,
          user.id,
          story.id,
        );
        const sectionsRead = pops?.length ?? 0;
        if (sectionsRead > 0 && sectionsRead < 5) {
          return { ...story, sectionsRead };
        }
        return null;
      }),
    );
    inProgress = inProgressStories.filter(
      (s): s is NonNullable<typeof s> => s !== null,
    ) as typeof storiesWithPops;
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Popcycle header */}
      {popcycle && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-white">
              {popcycle.status === "reading_open" ? "Reading Open" : "Submissions Open"}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {popcycle.format}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {popcycle.title}
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {popcycle.prompt}
          </p>
        </div>
      )}

      {!popcycle && (
        <div className="text-center py-16">
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">
            No Active Popcycle
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Check back soon for the next round of stories.
          </p>
        </div>
      )}

      {/* Currently Reading */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Currently Reading</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {inProgress.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.id}`}
                className="flex-shrink-0 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
              >
                <p className="text-sm font-semibold truncate">{story.title}</p>
                <div className="mt-2 w-full bg-[var(--color-border)] rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-[var(--color-primary)]"
                    style={{
                      width: `${(((story as Record<string, unknown>).sectionsRead as number) / 5) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {(story as Record<string, unknown>).sectionsRead as number}/5 sections
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Story Bubbles */}
      {storiesWithPops.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Stories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storiesWithPops.map((story) => {
              const bgColor = genreColors[story.genre] ?? colors.accent[500];
              return (
                <Link
                  key={story.id}
                  href={`/story/${story.id}`}
                  className="group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
                >
                  {/* Genre color bar */}
                  <div
                    className="h-2"
                    style={{ backgroundColor: bgColor }}
                  />

                  <div className="p-5">
                    {/* Genre badge */}
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white mb-3"
                      style={{ backgroundColor: bgColor }}
                    >
                      {story.genre}
                    </span>

                    {/* Title */}
                    <h3 className="text-base font-bold group-hover:text-[var(--color-primary)] transition-colors">
                      {story.title}
                    </h3>

                    {/* Hook */}
                    <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {truncateText(story.hook, 120)}
                    </p>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {story.users?.avatar_url ? (
                          <img
                            src={story.users.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: bgColor }}
                          >
                            {story.users?.pen_name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                        )}
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          @{story.users?.pen_name ?? "unknown"}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-primary)]">
                        {story.popCount} pops
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {popcycle && storiesWithPops.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <p className="text-lg font-medium">No stories published yet.</p>
          <p className="mt-1 text-sm">Be the first to submit!</p>
        </div>
      )}
    </div>
  );
}
