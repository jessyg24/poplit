"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: "📖" },
  { href: "/submit", label: "Submit", icon: "✍️" },
  { href: "/popoff", label: "Popoff", icon: "🏆" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/profile", label: "Profile", icon: "👤" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function AppSidebar({
  penName,
  displayName,
  avatarUrl,
}: {
  penName: string;
  displayName: string | null | undefined;
  avatarUrl: string | null | undefined;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:border-[var(--color-border)] lg:bg-[var(--color-surface)]">
        {/* Logo */}
        <div className="px-6 py-6">
          <Link href="/feed" className="text-2xl font-extrabold tracking-tight">
            <span className="text-[var(--color-primary)]">Pop</span>
            <span className="text-[var(--color-accent)]">Lit</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)]"
                }`}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-[var(--color-border)]">
          <Link
            href={`/profile/${penName}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={penName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
                {penName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {displayName ?? penName}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                @{penName}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive
                    ? "text-[var(--color-primary)] font-semibold"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
