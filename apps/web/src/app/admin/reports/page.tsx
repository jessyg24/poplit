import { createAdminClient } from "@/lib/supabase/admin";
import { ReportActions } from "./actions";
import type { ReportStatus } from "@poplit/core/types";

const statusColors: Record<ReportStatus, string> = {
  open: "bg-red-100 text-red-700",
  investigating: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ReportsPage() {
  const admin = createAdminClient();

  const { data: reports, error } = await admin
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-500">Error loading reports: {error.message}</p>;
  }

  // Fetch reporter names
  const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))];
  const { data: reporters } = reporterIds.length > 0
    ? await admin.from("users").select("id, pen_name").in("id", reporterIds)
    : { data: [] };
  const reporterMap: Record<string, string> = {};
  (reporters ?? []).forEach((r) => { reporterMap[r.id] = r.pen_name; });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Reports</h1>

      {(reports ?? []).length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
          No reports to display.
        </div>
      ) : (
        <div className="space-y-4">
          {(reports ?? []).map((report) => (
            <div
              key={report.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[report.status as ReportStatus]}`}>
                      {report.status}
                    </span>
                    <span className="rounded-full bg-[var(--color-background)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                      {report.target_type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                    {report.reason}
                  </p>
                  {report.details && (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{report.details}</p>
                  )}
                </div>
                <div className="text-right text-sm text-[var(--color-text-secondary)]">
                  <p>by {reporterMap[report.reporter_id] ?? "Unknown"}</p>
                  <p>{formatDate(report.created_at)}</p>
                </div>
              </div>

              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Target ID: <span className="font-mono">{report.target_id}</span>
              </p>

              {report.resolution_note && (
                <p className="mt-2 rounded-md bg-[var(--color-background)] p-2 text-sm text-[var(--color-text-secondary)]">
                  Resolution: {report.resolution_note}
                </p>
              )}

              {report.status === "open" || report.status === "investigating" ? (
                <ReportActions reportId={report.id} currentStatus={report.status} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
