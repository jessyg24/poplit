"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({
  profileId,
  isFollowing: initialFollowing,
}: {
  profileId: string;
  isFollowing: boolean;
}) {
  const supabase = createClient();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileId);
      setFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: profileId });
      setFollowing(true);
    }

    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 ${
        following
          ? "border border-[var(--color-border)] hover:bg-[var(--color-background)]"
          : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
      }`}
    >
      {loading ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}
