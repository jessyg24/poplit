import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center">
        <p className="text-sm font-medium text-orange-500 tracking-wide uppercase mb-4">
          Weekly Short Story Contests
        </p>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-800 mb-6 leading-[1.1]">
          Stories that{" "}
          <span className="bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Pop
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Writers pay $3 to enter. Readers read for free. The most&#8209;read
          story wins 65% of the pot. Simple as that.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="px-7 py-3 rounded-full bg-slate-800 text-white font-medium text-sm hover:bg-slate-700 transition-all hover:shadow-lg"
          >
            Start Reading
          </Link>
          <Link
            href="/features"
            className="px-7 py-3 rounded-full border border-slate-200 text-slate-600 font-medium text-sm hover:bg-white hover:border-slate-300 transition-all"
          >
            How It Works
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Submit",
              desc: "Write a short story, pick a genre, and enter the weekly Popcycle for $3.",
              accent: "from-orange-400 to-orange-500",
            },
            {
              step: "02",
              title: "Discover",
              desc: "Readers swipe through story bubbles. Each section read earns the writer a weighted Pop.",
              accent: "from-purple-400 to-purple-500",
            },
            {
              step: "03",
              title: "Win",
              desc: "At Popoff, the most-read story takes home 65% of the prize pool.",
              accent: "from-blue-400 to-blue-500",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="group p-8 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-100 hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${item.accent} text-white text-xs font-bold mb-5`}
              >
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-12">
        <div className="flex items-center justify-center gap-16 text-center">
          {[
            { value: "$3", label: "Entry fee" },
            { value: "65%", label: "To the winner" },
            { value: "5", label: "Story sections" },
            { value: "7", label: "Days per cycle" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Ready to pop?</h2>
          <p className="text-slate-500 mb-8">
            Join the next Popcycle. Free to read, $3 to compete.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-purple-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-orange-500/20 transition-all"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
