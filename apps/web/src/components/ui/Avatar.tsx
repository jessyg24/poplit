"use client";

// ── Animal silhouette paths (viewBox 0 0 24 24) ──
const ANIMALS: Record<string, string> = {
  fox: "M12 2C10.5 2 9 3.5 7 5C5 3 3.5 2 2 3C1 4 2 6 3 7.5C2 9 2 11 3 13C4 15 6 17 8 18.5C9.5 19.5 10.5 21 12 22C13.5 21 14.5 19.5 16 18.5C18 17 20 15 21 13C22 11 22 9 21 7.5C22 6 23 4 22 3C20.5 2 19 3 17 5C15 3.5 13.5 2 12 2Z",
  owl: "M12 3C8 3 5 6 5 10C5 11.5 5.5 13 6.5 14L4 20H8L9.5 17C10.3 17.3 11.1 17.5 12 17.5C12.9 17.5 13.7 17.3 14.5 17L16 20H20L17.5 14C18.5 13 19 11.5 19 10C19 6 16 3 12 3ZM9 9C9.8 9 10.5 9.7 10.5 10.5S9.8 12 9 12S7.5 11.3 7.5 10.5S8.2 9 9 9ZM15 9C15.8 9 16.5 9.7 16.5 10.5S15.8 12 15 12S13.5 11.3 13.5 10.5S14.2 9 15 9Z",
  cat: "M12 22C17 22 20 18 20 14C20 10 18 8 18 6C18 4 19 2 19 2C19 2 17 3 15.5 4C14 3 13 2.5 12 2.5C11 2.5 10 3 8.5 4C7 3 5 2 5 2C5 2 6 4 6 6C6 8 4 10 4 14C4 18 7 22 12 22ZM9 13C9.6 13 10 13.4 10 14C10 14.6 9.6 15 9 15C8.4 15 8 14.6 8 14C8 13.4 8.4 13 9 13ZM15 13C15.6 13 16 13.4 16 14C16 14.6 15.6 15 15 15C14.4 15 14 14.6 14 14C14 13.4 14.4 13 15 13ZM12 16C11 16 10.5 15.5 10.5 15.5L12 16.5L13.5 15.5C13.5 15.5 13 16 12 16Z",
  bear: "M5.5 4C4.1 4 3 5.1 3 6.5C3 7.5 3.5 8.3 4.3 8.7C4.1 9.4 4 10.2 4 11C4 15.4 7.6 19 12 19C16.4 19 20 15.4 20 11C20 10.2 19.9 9.4 19.7 8.7C20.5 8.3 21 7.5 21 6.5C21 5.1 19.9 4 18.5 4C17.5 4 16.6 4.6 16.2 5.4C14.9 4.5 13.5 4 12 4C10.5 4 9.1 4.5 7.8 5.4C7.4 4.6 6.5 4 5.5 4ZM9 11C9.8 11 10.5 11.7 10.5 12.5S9.8 14 9 14S7.5 13.3 7.5 12.5S8.2 11 9 11ZM15 11C15.8 11 16.5 11.7 16.5 12.5S15.8 14 15 14S13.5 13.3 13.5 12.5S14.2 11 15 11ZM12 17C10.5 17 10 16 10 16L12 17L14 16C14 16 13.5 17 12 17Z",
  rabbit: "M12 22C16 22 19 18.5 19 15C19 12 17.5 10 16 9C16 7 16.5 3 15 2C13.5 1 13 4 12.5 6C12.3 6 12.2 6 12 6C11.8 6 11.7 6 11.5 6C11 4 10.5 1 9 2C7.5 3 8 7 8 9C6.5 10 5 12 5 15C5 18.5 8 22 12 22ZM9.5 14C10.1 14 10.5 14.4 10.5 15C10.5 15.6 10.1 16 9.5 16C8.9 16 8.5 15.6 8.5 15C8.5 14.4 8.9 14 9.5 14ZM14.5 14C15.1 14 15.5 14.4 15.5 15C15.5 15.6 15.1 16 14.5 16C13.9 16 13.5 15.6 13.5 15C13.5 14.4 13.9 14 14.5 14Z",
  wolf: "M12 2L8 5C6 4 4 3 3 4C2 5 3 7 4 8C3 10 3 12 4 14C5 16 7 18 9 19.5C10 20.3 11 21 12 22C13 21 14 20.3 15 19.5C17 18 19 16 20 14C21 12 21 10 20 8C21 7 22 5 21 4C20 3 18 4 16 5L12 2ZM8.5 11C9.3 11 10 11.7 10 12.5S9.3 14 8.5 14S7 13.3 7 12.5S7.7 11 8.5 11ZM15.5 11C16.3 11 17 11.7 17 12.5S16.3 14 15.5 14S14 13.3 14 12.5S14.7 11 15.5 11ZM12 17L10 15.5C10 15.5 10.5 17 12 17C13.5 17 14 15.5 14 15.5L12 17Z",
  panda: "M5 5C3.3 5 2 6.3 2 8C2 9.3 2.8 10.4 4 10.8C4 11.2 4 11.6 4 12C4 16.4 7.6 20 12 20C16.4 20 20 16.4 20 12C20 11.6 20 11.2 20 10.8C21.2 10.4 22 9.3 22 8C22 6.3 20.7 5 19 5C17.9 5 17 5.6 16.5 6.4C15.2 5.5 13.7 5 12 5C10.3 5 8.8 5.5 7.5 6.4C7 5.6 6.1 5 5 5ZM8 10C9.7 10 11 11.3 11 13C11 14.7 9.7 16 8 16C6.3 16 5 14.7 5 13C5 11.3 6.3 10 8 10ZM16 10C17.7 10 19 11.3 19 13C19 14.7 17.7 16 16 16C14.3 16 13 14.7 13 13C13 11.3 14.3 10 16 10ZM8 12C7.4 12 7 12.4 7 13C7 13.6 7.4 14 8 14C8.6 14 9 13.6 9 13C9 12.4 8.6 12 8 12ZM16 12C15.4 12 15 12.4 15 13C15 13.6 15.4 14 16 14C16.6 14 17 13.6 17 13C17 12.4 16.6 12 16 12Z",
  penguin: "M12 2C9 2 7 4.5 7 7.5C7 8.5 7.3 9.5 7.8 10.3L4 16L7 15C7.5 17 8.5 18.5 10 19.5C10 20 9.5 20.5 9 21C9 21 10.5 21 11.5 20.5C11.7 20.5 11.8 20.5 12 20.5C12.2 20.5 12.3 20.5 12.5 20.5C13.5 21 15 21 15 21C14.5 20.5 14 20 14 19.5C15.5 18.5 16.5 17 17 15L20 16L16.2 10.3C16.7 9.5 17 8.5 17 7.5C17 4.5 15 2 12 2ZM10 8C10.6 8 11 8.4 11 9C11 9.6 10.6 10 10 10C9.4 10 9 9.6 9 9C9 8.4 9.4 8 10 8ZM14 8C14.6 8 15 8.4 15 9C15 9.6 14.6 10 14 10C13.4 10 13 9.6 13 9C13 8.4 13.4 8 14 8Z",
};

const COLORS: Record<string, string> = {
  purple: "#8B5CF6",
  blue: "#3B82F6",
  teal: "#14B8A6",
  green: "#22C55E",
  amber: "#F59E0B",
  orange: "#F97316",
  rose: "#F43F5E",
  pink: "#EC4899",
  slate: "#64748B",
  red: "#EF4444",
};

export const ANIMAL_NAMES = Object.keys(ANIMALS);
export const COLOR_NAMES = Object.keys(COLORS);

/** Parse "fox-purple" → { animal: "fox", color: "purple" } */
export function parseAvatarId(id: string | null | undefined) {
  if (!id) return null;
  const parts = id.split("-");
  const animal = parts[0];
  const color = parts[1];
  if (animal && color && ANIMALS[animal] && COLORS[color]) return { animal, color };
  return null;
}

/** Render an avatar circle. Falls back to first-letter initial. */
export function Avatar({
  avatarId,
  fallbackInitial,
  size = 80,
  className = "",
}: {
  avatarId: string | null | undefined;
  fallbackInitial?: string;
  size?: number;
  className?: string;
}) {
  const parsed = parseAvatarId(avatarId);

  if (!parsed) {
    return (
      <div
        className={`rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {(fallbackInitial ?? "?").charAt(0).toUpperCase()}
      </div>
    );
  }

  const bg = COLORS[parsed.color];
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.55}
        height={size * 0.55}
        fill="white"
        fillOpacity={0.9}
      >
        <path d={ANIMALS[parsed.animal]} />
      </svg>
    </div>
  );
}

/** Grid picker for choosing an avatar. */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="block text-sm font-medium mb-1.5">Avatar</p>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {ANIMAL_NAMES.map((animal) =>
          COLOR_NAMES.map((color) => {
            const id = `${animal}-${color}`;
            const isSelected = value === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={`rounded-full transition-all ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110"
                    : "hover:scale-105 opacity-80 hover:opacity-100"
                }`}
                title={`${animal} - ${color}`}
              >
                <Avatar avatarId={id} size={40} />
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
