import { create } from "zustand";
import type { Story, Popcycle } from "@poplit/core/types";

interface FeedState {
  stories: Story[];
  activePopcycle: Popcycle | null;
  isLoading: boolean;
  currentStoryId: string | null;

  setStories: (stories: Story[]) => void;
  setActivePopcycle: (popcycle: Popcycle | null) => void;
  setCurrentStory: (storyId: string | null) => void;
}

export const useFeedStore = create<FeedState>()((set) => ({
  stories: [],
  activePopcycle: null,
  isLoading: false,
  currentStoryId: null,

  setStories: (stories) => set({ stories }),

  setActivePopcycle: (activePopcycle) => set({ activePopcycle }),

  setCurrentStory: (currentStoryId) => set({ currentStoryId }),
}));
