import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserById } from "@poplit/core/queries";
import { AppSidebar } from "./app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: profile } = await getUserById(supabase, authUser.id);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile header */}
      <MobileHeader
        penName={profile?.pen_name ?? "User"}
        avatarUrl={profile?.avatar_url}
      />

      {/* Desktop sidebar */}
      <AppSidebar
        penName={profile?.pen_name ?? "User"}
        displayName={profile?.display_name}
        avatarUrl={profile?.avatar_url}
      />

      {/* Main content */}
      <main className="flex-1 min-h-screen lg:ml-64">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

function MobileHeader({
  penName,
  avatarUrl,
}: {
  penName: string;
  avatarUrl: string | null | undefined;
}) {
  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <span className="text-lg font-extrabold tracking-tight text-[var(--color-primary)]">
        PopLit
      </span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--color-text-secondary)]">
          @{penName}
        </span>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={penName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold">
            {penName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
