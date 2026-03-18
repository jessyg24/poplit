import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLogoutButton } from "./logout-button";

interface SidebarLink {
  label: string;
  href: string;
  badge?: number;
}

interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

async function getQueueCounts() {
  const admin = createAdminClient();

  const [reportsRes, flaggedRes, submissionsRes] = await Promise.all([
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("ai_flagged", true).eq("status", "ai_flagged"),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
  ]);

  return {
    openReports: reportsRes.count ?? 0,
    aiFlagged: flaggedRes.count ?? 0,
    pendingSubmissions: submissionsRes.count ?? 0,
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    notFound();
  }

  const counts = await getQueueCounts();

  const sections: SidebarSection[] = [
    {
      title: "Overview",
      links: [
        { label: "Dashboard", href: "/admin" },
      ],
    },
    {
      title: "Content",
      links: [
        { label: "Popcycles", href: "/admin/popcycles" },
        { label: "Submissions", href: "/admin/submissions", badge: counts.pendingSubmissions },
        { label: "AI Review", href: "/admin/ai-review", badge: counts.aiFlagged },
        { label: "Content", href: "/admin/content" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "Users", href: "/admin/users" },
        { label: "Reports", href: "/admin/reports", badge: counts.openReports },
        { label: "Strikes", href: "/admin/strikes" },
        { label: "Watchlist", href: "/admin/watchlist" },
      ],
    },
    {
      title: "Scoring & Revenue",
      links: [
        { label: "Scores", href: "/admin/scores" },
        { label: "Payouts", href: "/admin/payouts" },
        { label: "Badges", href: "/admin/badges" },
        { label: "Wildcards", href: "/admin/wildcards" },
        { label: "Anthology", href: "/admin/anthology" },
        { label: "Sponsors", href: "/admin/sponsors" },
      ],
    },
    {
      title: "Platform",
      links: [
        { label: "Settings", href: "/admin/settings" },
        { label: "Analytics", href: "/admin/analytics" },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col">
        <Link href="/admin" className="mb-6 block text-lg font-bold text-[var(--color-primary)]">
          PopLit Admin
        </Link>

        <nav className="space-y-6 flex-1">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                    >
                      <span>{link.label}</span>
                      {link.badge !== undefined && link.badge > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-xs font-medium text-white">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <AdminLogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
