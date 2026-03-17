import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold text-[var(--color-primary)]">
            PopLit
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/features" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              Features
            </Link>
            <Link href="/archive" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              Archive
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--color-border)] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[var(--color-text-secondary)]">
          &copy; {new Date().getFullYear()} PopLit. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
