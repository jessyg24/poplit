import Link from "next/link";
import { FloatingBubbles } from "@/components/ui/floating-bubbles";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
      <FloatingBubbles count={16} />
      <header className="backdrop-blur-sm bg-white/70 border-b border-slate-100">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-800">
            Pop<span className="text-orange-500">Lit</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/features" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
              Features
            </Link>
            <Link href="/archive" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
              Archive
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium px-5 py-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="py-10 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} PopLit. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
