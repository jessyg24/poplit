"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminLogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="w-full rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
    >
      {loggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}
