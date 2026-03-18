// Scoring weights for reader multiplier calculation
export const SCORING_WEIGHTS = {
  accountAge: { weight: 0.25, minDays: 7, maxDays: 365 },
  completionRate: { weight: 0.30, minRate: 0.1, maxRate: 0.9 },
  activityLevel: { weight: 0.20, minPops: 5, maxPops: 100 },
  badgeCount: { weight: 0.10, minBadges: 0, maxBadges: 10 },
  contestHistory: { weight: 0.15, minEntries: 0, maxEntries: 20 },
  multiplierFloor: 0.90,
  multiplierCeiling: 1.10,
} as const;

// Section weights for pop scoring
export const SECTION_WEIGHTS = {
  1: 1.0,
  2: 1.2,
  3: 1.4,
  4: 1.6,
  5: 2.0,
} as const;

// Minimum read time (ms) per section to count as a valid pop
export const MIN_READ_TIME_MS = 15_000; // 15 seconds

// Story constraints
export const STORY_LIMITS = {
  minWords: 1000,
  maxWords: 5000,
  sections: 5,
  hookMaxLength: 280,
  titleMaxLength: 100,
} as const;

// Entry fee
export const ENTRY_FEE_CENTS = 300; // $3.00

// Prize distribution defaults
export const PRIZE_DISTRIBUTION = {
  housePct: 15,
  firstPct: 65,
  secondPct: 12,
  thirdPct: 5,
  // 4th–10th each receive 1 free entry credit (no cash payout)
  runnerUpFreeEntryCredits: 1,
  runnerUpPlaces: { start: 4, end: 10 },
} as const;

// Genres
export const GENRES = [
  "Literary Fiction",
  "Science Fiction",
  "Fantasy",
  "Horror",
  "Mystery",
  "Thriller",
  "Romance",
  "Historical Fiction",
  "Humor",
  "Drama",
  "Magical Realism",
  "Dystopian",
  "Slice of Life",
  "Experimental",
] as const;

export type Genre = (typeof GENRES)[number];

// Moods
export const MOODS = [
  "Dark",
  "Hopeful",
  "Melancholy",
  "Whimsical",
  "Tense",
  "Nostalgic",
  "Eerie",
  "Romantic",
  "Satirical",
  "Reflective",
] as const;

export type Mood = (typeof MOODS)[number];

// Trigger warnings
export const TRIGGER_WARNINGS = [
  "Violence",
  "Gore",
  "Sexual Content",
  "Substance Abuse",
  "Self-Harm",
  "Death",
  "Abuse",
  "Mental Health",
  "Strong Language",
  "War",
] as const;

// Badge definitions
export const BADGE_DEFINITIONS = {
  first_pop: { name: "First Pop", description: "Read your first story section", icon: "sparkles" },
  bookworm: { name: "Bookworm", description: "Complete reading 10 stories", icon: "book-open" },
  devoted_reader: { name: "Devoted Reader", description: "Complete reading 50 stories", icon: "library" },
  first_entry: { name: "First Entry", description: "Submit your first story", icon: "pencil" },
  serial_writer: { name: "Serial Writer", description: "Submit 5 stories", icon: "pen-tool" },
  podium_finish: { name: "Podium Finish", description: "Finish top 3 in a Popcycle", icon: "trophy" },
  champion: { name: "Champion", description: "Win a Popcycle", icon: "crown" },
  wildcard: { name: "Wildcard", description: "Win a wildcard slot", icon: "zap" },
  social_butterfly: { name: "Social Butterfly", description: "Gain 50 followers", icon: "users" },
  anthology: { name: "Anthology Pick", description: "Selected for quarterly anthology", icon: "star" },
} as const;

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  monthly: {
    name: "PopLit Monthly",
    priceCents: 1200, // $12/mo
    entryCredits: 5, // 5 entry credits, rollover
    features: ["5 entry credits/month (rollover)", "Ad-free reading", "Early access to stories", "Exclusive badges"],
  },
  annual: {
    name: "PopLit Annual",
    priceCents: 13200, // $132/yr
    entryCredits: 65, // 65 entry credits
    features: ["65 entry credits/year", "Ad-free reading", "Early access to stories", "Exclusive badges", "Best value — save $12/yr"],
  },
} as const;

// Rate limits
export const RATE_LIMITS = {
  popsPerMinute: 10,
  commentsPerMinute: 5,
  messagesPerMinute: 10,
  submissionsPerPopcycle: 1,
} as const;

// AI detection threshold (≥65% flags as AI-generated)
export const AI_DETECTION_THRESHOLD = 0.65;

// Max inline text reactions per reader per story
export const MAX_REACTIONS_PER_READER = 10;

// Survey decay — higher answer = more disappointment = more decay
export const SURVEY_DECAY = { A: 1.00, B: 0.95, C: 0.82, D: 0.65 } as const;

// Highlight convergence — overlapping reactions boost score
export const HIGHLIGHT_CONVERGENCE = {
  overlapChars: 50,
  tier1Count: 3,
  tier1Multiplier: 1.25,
  tier2Count: 5,
  tier2Multiplier: 1.50,
} as const;

// Re-read bonus per re-read
export const RE_READ_BONUS_PER = 0.3;

// Pop-py Garden boost tiers — more gardens = higher pop multiplier
export const GARDEN_BOOST_TIERS = [
  { minCount: 10, multiplier: 1.50 },
  { minCount: 5, multiplier: 1.35 },
  { minCount: 2, multiplier: 1.20 },
  { minCount: 1, multiplier: 1.10 },
] as const;

export function gardenBoostForCount(count: number): number {
  for (const tier of GARDEN_BOOST_TIERS) {
    if (count >= tier.minCount) return tier.multiplier;
  }
  return 1.0;
}

// Exit survey reasons
export const EXIT_SURVEY_REASONS = [
  { key: "A", label: "Not my taste — the genre/style didn't click" },
  { key: "B", label: "Lost interest — the story didn't hold my attention" },
  { key: "C", label: "Pacing issues — too slow, too fast, or confusing" },
  { key: "D", label: "Writing quality — grammar, clarity, or craft issues" },
  { key: "E", label: "Just busy — I'll come back later" },
  { key: "F", label: "Content warning — the content made me uncomfortable" },
] as const;

// Ending survey questions
export const ENDING_SURVEY_QUESTIONS = {
  q1: {
    prompt: "Did the ending deliver?",
    options: [
      { key: "A", label: "Yes — stuck the landing" },
      { key: "B", label: "It was fine" },
      { key: "C", label: "Felt rushed or flat" },
      { key: "D", label: "Wish I stopped earlier" },
    ],
  },
  q2: {
    prompt: "Was this story worth your time?",
    options: [
      { key: "A", label: "Absolutely" },
      { key: "B", label: "Mostly" },
      { key: "C", label: "Not really" },
      { key: "D", label: "I want my pops back" },
    ],
  },
} as const;
