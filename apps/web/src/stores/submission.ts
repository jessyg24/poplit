import { create } from "zustand";
import type { Story } from "@poplit/core/types";
import type { Database } from "@poplit/core/types";

type StoryInsert = Database["public"]["Tables"]["stories"]["Insert"];

type PaymentStatus = "idle" | "processing" | "succeeded" | "failed";

interface SubmissionState {
  draft: Partial<StoryInsert>;
  isSubmitting: boolean;
  paymentStatus: PaymentStatus;

  updateDraft: (fields: Partial<StoryInsert>) => void;
  submitStory: () => Promise<void>;
  setPaymentStatus: (status: PaymentStatus) => void;
  clearDraft: () => void;
}

export const useSubmissionStore = create<SubmissionState>()((set, get) => ({
  draft: {},
  isSubmitting: false,
  paymentStatus: "idle",

  updateDraft: (fields) =>
    set((state) => ({ draft: { ...state.draft, ...fields } })),

  submitStory: async () => {
    set({ isSubmitting: true });
    try {
      // Submission logic handled by the calling component via server action / API route.
      // This action serves as a state flag so UI can react to the submitting state.
    } finally {
      set({ isSubmitting: false });
    }
  },

  setPaymentStatus: (paymentStatus) => set({ paymentStatus }),

  clearDraft: () => set({ draft: {}, paymentStatus: "idle" }),
}));
