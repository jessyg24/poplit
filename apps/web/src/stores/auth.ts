import { create } from "zustand";
import type { User } from "@poplit/core/types";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),

  setSession: (session) =>
    set({ session, isAuthenticated: session !== null }),

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    const supabase = createClient();
    set({ isLoading: true });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      set({ user: null, session: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    set({
      user: data ?? null,
      session,
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));
