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
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  // Hydrate mode from localStorage + check admin role
  useEffect(() => {
    const stored = localStorage.getItem("poplit-mode");
    if (stored === "reading" || stored === "writing") {
      setMode(stored);
    }
    // Check if user is admin
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.app_metadata?.role === "admin") {
        setIsAdmin(true);
      }
    });
    setHydrated(true);
  }, [setMode, supabase.auth]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Don't render until hydrated to avoid flash
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Skip chooser if they already have a preference
  if (mode === "reading") {
    return <ReadingMode isAdmin={isAdmin} />;
  }

  if (mode === "writing") {
    return <WritingMode isAdmin={isAdmin} />;
  }

  // ---------- Intent Chooser ----------
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <p className="text-sm font-bold tracking-tight text-slate-800">
          <span className="text-orange-500">Pop</span>
          <span className="text-slate-400">Lit</span>
        </p>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <a
              href="/admin"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
            >
              Admin
            </a>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {loggingOut ? "..." : "Logout"}
          </button>
        </div>
      </div>

      {/* Title text */}
      <div className="absolute top-[18vh] left-0 right-0 z-20 text-center pointer-events-none">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800">
          What are you here for today?
        </h1>
        <p className="mt-2 text-slate-500 text-sm">
          Pop a bubble to get started
        </p>
      </div>

      {/* Animated chooser bubbles */}
      <ChooserBubbles
        onSelect={(choice) => {
          setMode(choice);
        }}
      />
    </div>
  );
}
