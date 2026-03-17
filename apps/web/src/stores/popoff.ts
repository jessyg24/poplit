import { create } from "zustand";
import type { Score } from "@poplit/core/types";

interface PopoffState {
  isLive: boolean;
  countdown: number;
  winners: [Score | null, Score | null, Score | null];
  isRevealing: boolean;

  setPopoffState: (state: Partial<Pick<PopoffState, "isLive" | "countdown" | "winners">>) => void;
  revealNext: () => void;
}

export const usePopoffStore = create<PopoffState>()((set, get) => ({
  isLive: false,
  countdown: 0,
  winners: [null, null, null],
  isRevealing: false,

  setPopoffState: (partial) => set(partial),

  revealNext: () => {
    const { winners } = get();
    // Reveal from 3rd place up: find the next null-to-revealed transition
    const revealIndex = winners[2] === null ? 2 : winners[1] === null ? 1 : 0;
    set({ isRevealing: true });
    // The actual winner data should be set via setPopoffState before calling revealNext.
    // isRevealing can be toggled off by the consuming component after the animation completes.
  },
}));
