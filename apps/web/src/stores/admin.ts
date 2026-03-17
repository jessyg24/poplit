import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

interface QueueCounts {
  pendingReviews: number;
  aiFlags: number;
  reports: number;
}

interface AdminState {
  queueCounts: QueueCounts;
  selectedPopcycleId: string | null;

  refreshCounts: () => Promise<void>;
  setSelectedPopcycle: (id: string | null) => void;
}

export const useAdminStore = create<AdminState>()((set) => ({
  queueCounts: { pendingReviews: 0, aiFlags: 0, reports: 0 },
  selectedPopcycleId: null,

  refreshCounts: async () => {
    const supabase = createClient();

    const [pending, flagged, openReports] = await Promise.all([
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("status", "ai_flagged"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

    set({
      queueCounts: {
        pendingReviews: pending.count ?? 0,
        aiFlags: flagged.count ?? 0,
        reports: openReports.count ?? 0,
      },
    });
  },

  setSelectedPopcycle: (selectedPopcycleId) => set({ selectedPopcycleId }),
}));
