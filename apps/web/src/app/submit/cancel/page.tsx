"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SubmitCancelPage() {
  return (
    <Suspense>
      <CancelContent />
    </Suspense>
  );
}

function CancelContent() {
  const params = useSearchParams();
  const storyId = params.get("story_id");

  // Clean up the draft story since payment was cancelled
  useEffect(() => {
    if (!storyId) return;
    const supabase = createClient();
    supabase
      .from("stories")
      .delete()
      .eq("id", storyId)
      .eq("status", "draft")
      .then(() => {});
  }, [storyId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
        <div className="text-5xl">😔</div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
          Payment Cancelled
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Your story was not submitted. No charges were made.
        </p>
        <p className="text-sm text-slate-400">
          You can try again anytime from the Submit tab.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-3 rounded-xl bg-slate-600 text-white font-semibold hover:bg-slate-700 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
