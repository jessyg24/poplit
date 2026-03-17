"use client";

import { motion } from "framer-motion";
import { formatCents } from "@poplit/core/utils";
import { PRIZE_DISTRIBUTION } from "@poplit/core/constants";

interface TopStory {
  rank: number;
  title: string;
  penName: string;
  displayScore: number;
  completionRate: number;
}

export function PopoffReveal({
  topStories,
  prizePool,
}: {
  topStories: TopStory[];
  prizePool: number;
}) {
  if (topStories.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <p className="text-[var(--color-text-secondary)]">
          Results are being calculated...
        </p>
      </div>
    );
  }

  // Arrange as 2nd, 1st, 3rd for podium display
  const podiumOrder = [
    topStories[1] ?? null, // 2nd place
    topStories[0] ?? null, // 1st place
    topStories[2] ?? null, // 3rd place
  ];

  const podiumHeights = ["h-32", "h-44", "h-24"];
  const podiumColors = [
    "bg-gray-300 dark:bg-gray-600", // Silver
    "bg-yellow-400 dark:bg-yellow-500", // Gold
    "bg-amber-600 dark:bg-amber-700", // Bronze
  ];
  const labels = ["2nd", "1st", "3rd"];
  const prizePercents = [
    PRIZE_DISTRIBUTION.secondPct,
    PRIZE_DISTRIBUTION.firstPct,
    PRIZE_DISTRIBUTION.thirdPct,
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center text-2xl font-extrabold mb-8"
      >
        Results Are In!
      </motion.h2>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4">
        {podiumOrder.map((story, i) => {
          if (!story) return <div key={i} className="w-28" />;

          return (
            <motion.div
              key={story.rank}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i === 1 ? 0.8 : i === 0 ? 0.4 : 1.2 }}
              className="flex flex-col items-center w-28"
            >
              {/* Story info */}
              <div className="text-center mb-3">
                <p className="text-xs font-bold text-[var(--color-text-secondary)]">
                  {labels[i]}
                </p>
                <p className="text-sm font-bold mt-1 truncate max-w-[7rem]">
                  {story.title}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  @{story.penName}
                </p>
                <p className="text-xs font-semibold text-[var(--color-primary)] mt-1">
                  {story.displayScore.toFixed(1)} pts
                </p>
              </div>

              {/* Prize amount */}
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: i === 1 ? 1.2 : i === 0 ? 0.8 : 1.6 }}
                className="text-sm font-extrabold text-[var(--color-primary)] mb-2"
              >
                {formatCents(Math.floor((prizePool * (prizePercents[i] ?? 0)) / 100))}
              </motion.p>

              {/* Podium block */}
              <div
                className={`w-full ${podiumHeights[i]} ${podiumColors[i]} rounded-t-xl flex items-start justify-center pt-3`}
              >
                <span className="text-2xl font-extrabold text-white drop-shadow">
                  {story.rank}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
