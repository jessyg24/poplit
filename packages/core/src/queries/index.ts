// Accept any Supabase client shape to avoid version mismatch issues
// between @supabase/ssr and @supabase/supabase-js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = { from: (table: string) => any };

// Users
export async function getUserByPenName(client: Client, penName: string) {
  return client.from("users").select("*").eq("pen_name", penName).single();
}

export async function getUserById(client: Client, id: string) {
  return client.from("users").select("*").eq("id", id).single();
}

export async function updateUserProfile(client: Client, id: string, data: Record<string, unknown>) {
  return client.from("users").update(data).eq("id", id).select().single();
}

// Stories
export async function getPublishedStories(client: Client, popcycleId: string, limit = 20, offset = 0) {
  return client
    .from("stories")
    .select("*, users!author_id(pen_name, display_name, avatar_url)")
    .eq("popcycle_id", popcycleId)
    .eq("status", "published")
    .range(offset, offset + limit - 1);
}

export async function getStoryById(client: Client, id: string) {
  return client
    .from("stories")
    .select("*, users!author_id(pen_name, display_name, avatar_url), scores(*)")
    .eq("id", id)
    .single();
}

export async function getStoriesByAuthor(client: Client, authorId: string) {
  return client
    .from("stories")
    .select("*, scores(*)")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
}

export async function createStory(client: Client, data: Record<string, unknown>) {
  return client.from("stories").insert(data).select().single();
}

// Popcycles
export async function getActivePopcycle(client: Client) {
  return client
    .from("popcycles")
    .select("*")
    .in("status", ["submissions_open", "reading_open"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
}

export async function getPopcycleById(client: Client, id: string) {
  return client.from("popcycles").select("*").eq("id", id).single();
}

export async function getAllPopcycles(client: Client) {
  return client.from("popcycles").select("*").order("created_at", { ascending: false });
}

// Pops
export async function recordPop(client: Client, data: Record<string, unknown>) {
  return client.from("pops").insert(data).select().single();
}

export async function getReaderPopsForStory(client: Client, readerId: string, storyId: string) {
  return client
    .from("pops")
    .select("*")
    .eq("reader_id", readerId)
    .eq("story_id", storyId)
    .order("section_opened", { ascending: true });
}

// Scores
export async function getScoresByPopcycle(client: Client, popcycleId: string) {
  return client
    .from("scores")
    .select("*, stories(title, hook, users!author_id(pen_name, display_name))")
    .eq("popcycle_id", popcycleId)
    .order("display_score", { ascending: false });
}

// Follows
export async function followUser(client: Client, followerId: string, followingId: string) {
  return client.from("follows").insert({ follower_id: followerId, following_id: followingId });
}

export async function unfollowUser(client: Client, followerId: string, followingId: string) {
  return client.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
}

export async function getFollowers(client: Client, userId: string) {
  return client.from("follows").select("*, users!follower_id(pen_name, display_name, avatar_url)").eq("following_id", userId);
}

export async function getFollowing(client: Client, userId: string) {
  return client.from("follows").select("*, users!following_id(pen_name, display_name, avatar_url)").eq("follower_id", userId);
}

// Comments
export async function getCommentsForStory(client: Client, storyId: string) {
  return client
    .from("comments")
    .select("*, users!user_id(pen_name, display_name, avatar_url)")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true });
}

export async function createComment(client: Client, data: Record<string, unknown>) {
  return client.from("comments").insert(data).select().single();
}

// Messages
export async function getConversation(client: Client, userId: string, otherUserId: string) {
  return client
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true });
}

export async function sendMessage(client: Client, data: Record<string, unknown>) {
  return client.from("messages").insert(data).select().single();
}

// Notifications
export async function getNotifications(client: Client, userId: string, limit = 50) {
  return client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function markNotificationRead(client: Client, id: string) {
  return client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

// Badges
export async function getUserBadges(client: Client, userId: string) {
  return client.from("user_badges").select("*, badges(*)").eq("user_id", userId);
}

// Reports (admin)
export async function getOpenReports(client: Client) {
  return client
    .from("reports")
    .select("*, users!reporter_id(pen_name)")
    .eq("status", "open")
    .order("created_at", { ascending: true });
}

// Strikes (admin)
export async function getActiveStrikes(client: Client, userId: string) {
  return client.from("strikes").select("*").eq("user_id", userId).eq("status", "active");
}
