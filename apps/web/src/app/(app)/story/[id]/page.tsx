import { createClient } from "@/lib/supabase/server";
import { getStoryById } from "@poplit/core/queries";
import { colors } from "@poplit/ui";
import { notFound } from "next/navigation";
import { StoryReader } from "./story-reader";
import { Avatar } from "@/components/ui/Avatar";

const genreColors = colors.genre as Record<string, string>;

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: story, error } = await getStoryById(supabase, id);
  if (error || !story) notFound();

  const author = story.users as {
    pen_name: string;
    real_name: string | null;
    avatar_url: string | null;
  } | null;

  const genreColor = genreColors[story.genre?.[0] ?? ""] ?? colors.accent[500];

  // Check if current user follows the author
  let isFollowing = false;
  if (user && author) {
    const { data: followData } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", story.author_id)
      .limit(1);
    isFollowing = (followData?.length ?? 0) > 0;
  }

  // Get existing pops from this reader for this story
  let existingPops: number[] = [];
  if (user) {
    const { data: pops } = await supabase
      .from("pops")
      .select("section_opened")
      .eq("reader_id", user.id)
      .eq("story_id", story.id);
    existingPops = pops?.map((p) => p.section_opened) ?? [];
  }

  const sections = [
    story.section_1,
    story.section_2,
    story.section_3,
    story.section_4,
    story.section_5,
  ].filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-0">
      {/* Header */}
      <div className="space-y-4 mb-8">
        {/* Genre / Mood / Triggers */}
        <div className="flex flex-wrap gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: genreColor }}
          >
            {(story.genre ?? []).join(", ")}
          </span>
          {story.mood && (
            <span className="px-3 py-1 rounded-full text-xs font-medium border border-[var(--color-border)]">
              {story.mood}
            </span>
          )}
          {story.triggers?.map((tw: string) => (
            <span
              key={tw}
              className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
            >
              {tw}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">
          {story.title}
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] italic">
          {story.hook}
        </p>

        {/* Author info */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <a
            href={`/profile/${author?.pen_name}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar
              avatarId={author?.avatar_url}
              fallbackInitial={author?.pen_name}
              size={40}
            />
            <div>
              <p className="text-sm font-semibold">
                {author?.pen_name}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                @{author?.pen_name}
              </p>
            </div>
          </a>

          <StoryReader
            storyId={story.id}
            authorId={story.author_id}
            sections={sections}
            existingPops={existingPops}
            isFollowing={isFollowing}
            isOwnStory={user?.id === story.author_id}
            readerId={user?.id ?? null}
            mode="follow-button"
          />
        </div>
      </div>

      {/* Story sections */}
      <StoryReader
        storyId={story.id}
        authorId={story.author_id}
        sections={sections}
        existingPops={existingPops}
        isFollowing={isFollowing}
        isOwnStory={user?.id === story.author_id}
        readerId={user?.id ?? null}
        mode="reader"
      />
    </div>
  );
}
