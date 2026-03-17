import { create } from "zustand";

interface ReaderState {
  currentSection: number;
  sectionsRead: Set<number>;
  readStartTime: number;
  isReading: boolean;

  openSection: (section: number) => void;
  recordPop: (section: number) => void;
  resetReader: () => void;
}

export const useReaderStore = create<ReaderState>()((set, get) => ({
  currentSection: 1,
  sectionsRead: new Set<number>(),
  readStartTime: 0,
  isReading: false,

  openSection: (section) =>
    set({
      currentSection: Math.max(1, Math.min(5, section)),
      readStartTime: Date.now(),
      isReading: true,
    }),

  recordPop: (section) => {
    const next = new Set(get().sectionsRead);
    next.add(section);
    set({ sectionsRead: next, isReading: false });
  },

  resetReader: () =>
    set({
      currentSection: 1,
      sectionsRead: new Set<number>(),
      readStartTime: 0,
      isReading: false,
    }),
}));
