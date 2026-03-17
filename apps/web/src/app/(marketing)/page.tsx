import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero */}
      <section className="py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Stories that{" "}
          <span className="text-[var(--color-primary)]">Pop</span>
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10">
          A weekly short story contest where reader engagement is the vote.
          Writers pay $1 to enter, readers read for free, and the most-read
          story wins 70% of the pot.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="px-8 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Start Reading
          </Link>
          <Link
            href="/features"
            className="px-8 py-3 rounded-xl border border-[var(--color-border)] font-semibold text-lg hover:bg-[var(--color-surface)] transition-colors"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Writers Submit",
              desc: "Pay $1, write a short story (1,000–5,000 words), and submit to the weekly Popcycle.",
            },
            {
              step: "2",
              title: "Readers Discover",
              desc: "Swipe through story bubbles. Each section you read earns the writer a weighted \"Pop.\"",
            },
            {
              step: "3",
              title: "Best Story Wins",
              desc: "At Popoff, the most-read story takes home 70% of the prize pool. Confetti included.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-[var(--color-text-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="p-12 rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Pop?</h2>
          <p className="text-lg opacity-90 mb-8">
            Join thousands of readers and writers in the next Popcycle.
          </p>
          <Link
            href="/auth/signup"
            className="px-8 py-3 rounded-xl bg-white text-[var(--color-primary)] font-semibold text-lg hover:bg-gray-100 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
