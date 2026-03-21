"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SubmitSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const storyId = params.get("story_id");
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!storyId) return;
    const supabase = createClient();
    supabase
      .from("stories")
      .select("title")
      .eq("id", storyId)
      .single()
      .then(({ data }) => {
        if (data) setTitle(data.title);
      });
  }, [storyId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-slate-200 bg-white p-8">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-extrabold text-slate-800">
          Story Submitted!
        </h1>
        <p className="text-slate-500">
          {title ? (
            <>Your story <span className="font-semibold text-slate-700">&ldquo;{title}&rdquo;</span> is now under review.</>
          ) : (
            <>Your story is now under review.</>
          )}
        </p>
        <p className="text-sm text-slate-500">
          You&apos;ll receive a notification once it&apos;s approved and published.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
