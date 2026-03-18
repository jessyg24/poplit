import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteCode = searchParams.get("ref");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Process invite code for OAuth signups
      if (inviteCode) {
        try {
          const admin = createAdminClient();
          const userId = data.user.id;

          // Check if user already has a referral (don't double-award)
          const { data: profile } = await admin
            .from("users")
            .select("invited_by, entry_credits")
            .eq("id", userId)
            .single();

          if (profile && !profile.invited_by) {
            // Look up inviter by code
            const { data: inviter } = await admin
              .from("users")
              .select("id, entry_credits")
              .eq("invite_code", inviteCode.toUpperCase())
              .single();

            if (inviter && inviter.id !== userId) {
              // Award 1 credit to invitee
              await admin
                .from("users")
                .update({
                  invited_by: inviter.id,
                  entry_credits: (profile.entry_credits ?? 0) + 1,
                })
                .eq("id", userId);

              // Award 1 credit to inviter
              await admin
                .from("users")
                .update({
                  entry_credits: (inviter.entry_credits ?? 0) + 1,
                })
                .eq("id", inviter.id);

              // Record redemption
              await admin.from("invite_redemptions").insert({
                inviter_id: inviter.id,
                invitee_id: userId,
                credits_awarded: true,
              });
            }
          }
        } catch {
          // Don't block login if invite processing fails
        }
      }

      return NextResponse.redirect(`${origin}/feed`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=Could+not+authenticate+user`,
  );
}
