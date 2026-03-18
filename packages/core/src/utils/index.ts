// Date utilities
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatCountdown(targetDate: string): string {
  const target = new Date(targetDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return "Now!";

  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Text utilities
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function splitIntoSections(text: string, sectionCount: number = 5): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const targetPerSection = Math.ceil(sentences.length / sectionCount);
  const sections: string[] = [];

  for (let i = 0; i < sectionCount; i++) {
    const start = i * targetPerSection;
    const end = Math.min(start + targetPerSection, sentences.length);
    const section = sentences.slice(start, end).join("").trim();
    if (section) sections.push(section);
  }

  // If we got fewer sections than expected, redistribute
  while (sections.length < sectionCount && sections.length > 0) {
    sections.push("");
  }

  return sections;
}

// Currency utilities
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatCentsCompact(cents: number): string {
  if (cents >= 100_00) return `$${Math.floor(cents / 100)}`;
  return formatCents(cents);
}

// Permission utilities
export function isAdmin(role: string): boolean {
  return role === "admin";
}

export function isWriter(role: string): boolean {
  return role === "user" || role === "admin";
}

export function canSubmit(role: string): boolean {
  return role === "user" || role === "admin";
}

// Scoring utilities
export function calculateReaderMultiplier(params: {
  accountAgeDays: number;
  completionRate: number;
  totalPops: number;
  badgeCount: number;
  contestEntries: number;
}): number {
  const w = {
    accountAge: { weight: 0.25, min: 7, max: 365 },
    completionRate: { weight: 0.30, min: 0.1, max: 0.9 },
    activity: { weight: 0.20, min: 5, max: 100 },
    badges: { weight: 0.10, min: 0, max: 10 },
    contests: { weight: 0.15, min: 0, max: 20 },
  };

  const normalize = (val: number, min: number, max: number) =>
    Math.min(1, Math.max(0, (val - min) / (max - min)));

  const raw =
    w.accountAge.weight * normalize(params.accountAgeDays, w.accountAge.min, w.accountAge.max) +
    w.completionRate.weight * normalize(params.completionRate, w.completionRate.min, w.completionRate.max) +
    w.activity.weight * normalize(params.totalPops, w.activity.min, w.activity.max) +
    w.badges.weight * normalize(params.badgeCount, w.badges.min, w.badges.max) +
    w.contests.weight * normalize(params.contestEntries, w.contests.min, w.contests.max);

  // Map 0..1 → 0.90..1.10
  return 0.90 + raw * 0.20;
}
