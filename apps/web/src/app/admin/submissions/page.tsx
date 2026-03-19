import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoryStatus } from "@poplit/core/types";
import { ApproveButton, RejectButton } from "./actions";

const statusColors: Record<StoryStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  ai_flagged: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-200 text-red-800",
  published: "bg-blue-100 text-blue-700",
  archived: "bg-gray-200 text-gray-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function SubmissionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = params.status ?? "all";
  const admin = createAdminClient();

  let query = admin
    .from("stories")
    .select("id, title, genre, word_count, status, created_at, author_id")
    .order("created_at", { ascending: false });

  if (filterStatus !== "all") {
    query = query.eq("status", filterStatus as StoryStatus);
  }

  const { data: stories, error } = await query;

  if (error) {
    return <p className="text-red-500">Error loading submissions: {error.message}</p>;
  }

  // Fetch author pen_names
  const authorIds = [...new Set((stories ?? []).map((s) => s.author_id))];
  const { data: authors } = authorIds.length > 0
    ? await admin.from("users").select("id, pen_name").in("id", authorIds)
    : { data: [] };
  const authorMap: Record<string, string> = {};
  (authors ?? []).forEach((a) => { authorMap[a.id] = a.pen_name; });

  const filters: { label: string; value: string }[] = [
    { label: "All", value: "all" },
    { label: "Pending Review", value: "pending_review" },
    { label: "AI Flagged", value: "ai_flagged" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  // Statuses that can be acted on (approve/reject)
  const actionableStatuses = new Set(["pending_review", "ai_flagged"]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Submissions</h1>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={`/admin/submissions${f.value === "all" ? "" : `?status=${f.value}`}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filterStatus === f.value
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Genre</th>
              <th className="px-4 py-3 font-medium">Words</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(stories ?? []).map((story) => (
              <tr key={story.id} className="hover:bg-[var(--color-surface)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">{story.title}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{authorMap[story.author_id] ?? "Unknown"}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{(story.genre ?? []).join(", ")}</td>
                <td className="px-4 py-3 text-[var(--color-text)]">{story.word_count.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[story.status as StoryStatus]}`}>
                    {story.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(story.created_at)}</td>
                <td className="px-4 py-3">
                  {actionableStatuses.has(story.status) ? (
                    <div className="flex gap-2">
                      <ApproveButton storyId={story.id} />
                      <RejectButton storyId={story.id} />
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--color-text-secondary)]">--</span>
                  )}
                </td>
              </tr>
            ))}
            {(stories ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No submissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
