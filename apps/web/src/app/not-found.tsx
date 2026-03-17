import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-[var(--color-primary)] mb-4">404</h1>
        <p className="text-xl text-[var(--color-text-secondary)] mb-8">
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
