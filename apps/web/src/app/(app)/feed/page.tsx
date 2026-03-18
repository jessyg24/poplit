"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useModeStore } from "@/stores/mode";
import { ChooserBubbles } from "@/components/ui/chooser-bubbles";
import { ReadingMode } from "./reading";
import { WritingMode } from "./writing";

export default function FeedPage() {
  const { mode, setMode } = useModeStore();
  const [hydrated, setHydrated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  // Hydrate mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("poplit-mode");
    if (stored === "reading" || stored === "writing") {
      setMode(stored);
    }
    setHydrated(true);
  }, [setMode]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Don't render until hydrated to avoid flash
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Skip chooser if they already have a preference
  if (mode === "reading") {
    return <ReadingMode />;
  }

  if (mode === "writing") {
    return <WritingMode />;
  }

  // ---------- Intent Chooser ----------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Logout button */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {loggingOut ? "..." : "Logout"}
        </button>
      </div>

      {/* Title text */}
      <div className="absolute top-[18vh] left-0 right-0 z-20 text-center pointer-events-none">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white">
          What are you here for today?
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
          Pop a bubble to get started
        </p>
      </div>

      {/* Animated chooser bubbles */}
      <ChooserBubbles
        onSelect={(choice) => {
          setMode(choice);
        }}
      />

      {/* Bottom hint */}
      <div className="absolute bottom-8 left-0 right-0 z-20 text-center pointer-events-none">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          <span className="text-orange-500 font-bold">Pop</span>
          <span className="text-slate-300 dark:text-slate-600 mx-1">Lit</span>
        </p>
      </div>
    </div>
  );
}
