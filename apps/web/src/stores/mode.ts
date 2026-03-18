import { create } from "zustand";

type Mode = "chooser" | "reading" | "writing";

interface ModeState {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const STORAGE_KEY = "poplit-mode";

function getStoredMode(): Mode {
  if (typeof window === "undefined") return "chooser";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "reading" || stored === "writing") return stored;
  return "chooser";
}

export const useModeStore = create<ModeState>()((set) => ({
  mode: typeof window !== "undefined" ? getStoredMode() : "chooser",
  setMode: (mode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
    set({ mode });
  },
}));
