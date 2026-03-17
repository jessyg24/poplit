import { createClient } from "@/lib/supabase/server";
import {
  getUserByPenName,
  getStoriesByAuthor,
  getUserBadges,
} from "@poplit/core/queries";
import { colors } from "@poplit/ui";
import { truncateText, formatRelativeDate } from "@poplit/core/utils";
import { notFound } from "next/navigation";
import { FollowButton } from "./follow-button";

const genreColors = colors.genre as Record<string, string>;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: profile, error } = await getUserByPenName(supabase, username);
  if (error || !profile) notFound();

  // Fetch stories, badges, followers, following in parallel
  const [
    { data: stories },
    { data: badges },
    { count: followerCount },
    { count: followingCount },
  ] = await Promise.all([
    getStoriesByAuthor(supabase, profile.id),
    getUserBadges(supabase, profile.id),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
  ]);

  // Check if current user follows this profile
  let isFollowing = false;
  if (authUser && authUser.id !== profile.id) {
    const { data: followData } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", authUser.id)
      .eq("following_id", profile.id)
      .limit(1);
    isFollowing = (followData?.length ?? 0) > 0;
  }

  const publishedStories = (stories ?? []).filter(
    (s: any) => s.status === "published",
  );

  const isOwnProfile = authUser?.id === profile.id;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 lg:pb-0">
      {/* Profile header */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.pen_name}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.pen_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold truncate">
                  {profile.display_name ?? profile.pen_name}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  @{profile.pen_name}
                </p>
              </div>

              {!isOwnProfile && authUser && (
                <FollowButton
                  profileId={profile.id}
                  isFollowing={isFollowing}
                />
              )}

              {isOwnProfile && (
                <a
                  href="/settings"
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors"
                >
                  Edit Profile
                </a>
              )}
            </div>

            {profile.bio && (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Stats */}
            <div className="mt-4 flex items-center gap-5 text-sm">
              <span>
                <strong>{followerCount}</strong>{" "}
                <span className="text-[var(--color-text-secondary)]">
                  followers
                </span>
              </span>
              <span>
                <strong>{followingCount}</strong>{" "}
                <span className="text-[var(--color-text-secondary)]">
                  following
                </span>
              </span>
              <span>
                <strong>{publishedStories.length}</strong>{" "}
                <span className="text-[var(--color-text-secondary)]">
                  lits
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((ub: any) => {
              const badge = (ub as Record<string, unknown>).badges as {
                name: string;
                description: string;
                icon: string;
              } | null;
              return (
                <div
                  key={ub.id}
                  title={badge?.description}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-accent)] text-white"
                >
                  {badge?.name ?? "Badge"}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Published stories (Lits) */}
      <section>
        <h2 className="text-lg font-bold mb-4">
          Lits{" "}
          <span className="text-[var(--color-text-secondary)] font-normal text-sm">
            ({publishedStories.length})
          </span>
        </h2>

        {publishedStories.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <p className="text-[var(--color-text-secondary)]">
              No published stories yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {publishedStories.map((story: any) => {
              const bgColor = genreColors[story.genre] ?? colors.accent[500];
              return (
                <a
                  key={story.id}
                  href={`/story/${story.id}`}
                  className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="h-1.5" style={{ backgroundColor: bgColor }} />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: bgColor }}
                      >
                        {story.genre}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {formatRelativeDate(story.created_at)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold">{story.title}</h3>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {truncateText(story.hook, 120)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
