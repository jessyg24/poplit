// Design tokens
export const colors = {
  // Primary palette — warm, energetic
  primary: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316", // Main brand orange
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
  },
  // Accent — popping purple
  accent: {
    50: "#FAF5FF",
    100: "#F3E8FF",
    200: "#E9D5FF",
    300: "#D8B4FE",
    400: "#C084FC",
    500: "#A855F7", // Main accent purple
    600: "#9333EA",
    700: "#7C3AED",
    800: "#6B21A8",
    900: "#581C87",
  },
  // Neutral
  gray: {
    50: "#FAFAFA",
    100: "#F4F4F5",
    200: "#E4E4E7",
    300: "#D4D4D8",
    400: "#A1A1AA",
    500: "#71717A",
    600: "#52525B",
    700: "#3F3F46",
    800: "#27272A",
    900: "#18181B",
    950: "#09090B",
  },
  // Semantic
  success: "#22C55E",
  warning: "#EAB308",
  error: "#EF4444",
  info: "#3B82F6",
  // Genre colors (for bubbles)
  genre: {
    "Literary Fiction": "#8B5CF6",
    "Science Fiction": "#06B6D4",
    Fantasy: "#A855F7",
    Horror: "#EF4444",
    Mystery: "#6366F1",
    Thriller: "#DC2626",
    Romance: "#EC4899",
    "Historical Fiction": "#D97706",
    Humor: "#F59E0B",
    Drama: "#8B5CF6",
    "Magical Realism": "#14B8A6",
    Dystopian: "#64748B",
    "Slice of Life": "#22C55E",
    Experimental: "#F472B6",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

// Theme definitions
export const lightTheme = {
  background: colors.gray[50],
  surface: "#FFFFFF",
  surfaceHover: colors.gray[100],
  text: colors.gray[900],
  textSecondary: colors.gray[500],
  textMuted: colors.gray[400],
  border: colors.gray[200],
  borderFocus: colors.primary[500],
  primary: colors.primary[500],
  primaryHover: colors.primary[600],
  accent: colors.accent[500],
} as const;

export const darkTheme = {
  background: colors.gray[950],
  surface: colors.gray[900],
  surfaceHover: colors.gray[800],
  text: colors.gray[50],
  textSecondary: colors.gray[400],
  textMuted: colors.gray[600],
  border: colors.gray[800],
  borderFocus: colors.primary[500],
  primary: colors.primary[500],
  primaryHover: colors.primary[400],
  accent: colors.accent[400],
} as const;
