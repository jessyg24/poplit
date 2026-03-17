export default function FeaturesPage() {
  const features = [
    {
      title: "Weekly Popcycles",
      desc: "Fresh prompts every week. Write to the theme, or go rogue — your call.",
      icon: "🔄",
    },
    {
      title: "Bubble Feed",
      desc: "Stories served as colorful genre-coded bubbles. Swipe, tap, discover.",
      icon: "🫧",
    },
    {
      title: "Weighted Scoring",
      desc: "Every read counts, but not equally. Our algorithm rewards genuine engagement over quick clicks.",
      icon: "⚖️",
    },
    {
      title: "5-Section Reader",
      desc: "Stories split into bite-sized sections. Each Pop you earn is weighted deeper.",
      icon: "📖",
    },
    {
      title: "Popoff Events",
      desc: "Weekly reveal ceremonies. Countdown, confetti, and cold hard prizes.",
      icon: "🎉",
    },
    {
      title: "Writer Dashboard",
      desc: "Track your Pops in real-time. See where readers drop off. Improve your craft.",
      icon: "📊",
    },
    {
      title: "AI Detection",
      desc: "We use GPTZero to keep it human. AI-generated stories get flagged and reviewed.",
      icon: "🤖",
    },
    {
      title: "Badge System",
      desc: "Earn badges for reading, writing, winning, and social engagement.",
      icon: "🏅",
    },
    {
      title: "Community Roadmap",
      desc: "Vote on features with Pokes. The community shapes what we build next.",
      icon: "🗺️",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">Features</h1>
      <p className="text-lg text-[var(--color-text-secondary)] text-center mb-12 max-w-2xl mx-auto">
        Everything you need for a fair, fun, and engaging short story contest platform.
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
