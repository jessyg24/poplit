import { createAdminClient } from "@/lib/supabase/admin";
import { AiReviewActions } from "./actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AiReviewPage() {
  const admin = createAdminClient();

  const { data: stories, error } = await admin
    .from("stories")
    .select("id, title, ai_score, ai_review_note, status, author_id, created_at, ai_assisted, ai_disclaimer, ai_disclaimer_source")
    .eq("ai_flagged", true)
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading flagged stories: {error.message}</p>;
  }

  // Fetch authors
  const authorIds = [...new Set((stories ?? []).map((s) => s.author_id))];
  const { data: authors } = authorIds.length > 0
    ? await admin.from("users").select("id, pen_name").in("id", authorIds)
    : { data: [] };
  const authorMap: Record<string, string> = {};
  (authors ?? []).forEach((a) => { authorMap[a.id] = a.pen_name; });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">AI Flagged Stories</h1>

      {(stories ?? []).length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
          No AI-flagged stories to review.
        </div>
      ) : (
        <div className="space-y-4">
          {(stories ?? []).map((story) => (
            <div
              key={story.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">{story.title}</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    by {authorMap[story.author_id] ?? "Unknown"} &middot; {formatDate(story.created_at)}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    AI Score: {story.ai_score !== null ? (story.ai_score * 100).toFixed(0) + "%" : "N/A"}
                  </span>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Status: {story.status.replace(/_/g, " ")}
                  </p>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    story.ai_disclaimer_source === "self_disclosed"
                      ? "bg-green-100 text-green-700"
                      : story.ai_disclaimer_source === "auto_flagged"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                  }`}>
                    {story.ai_disclaimer_source === "self_disclosed"
                      ? "Self-Disclosed"
                      : story.ai_disclaimer_source === "auto_flagged"
                        ? "Auto-Flagged (pops halved)"
                        : "No Disclosure"}
                  </span>
                </div>
              </div>

              {story.ai_review_note && (
                <p className="mt-3 rounded-md bg-[var(--color-background)] p-3 text-sm text-[var(--color-text-secondary)]">
                  {story.ai_review_note}
                </p>
              )}

              <AiReviewActions storyId={story.id} currentStatus={story.status} aiDisclaimer={story.ai_disclaimer ?? false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
