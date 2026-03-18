"use client";

import { useState, useEffect } from "react";
import { fetchAnalyticsTimeSeries, fetchRevenuePerPopcycle } from "../actions";

type DateRange = 7 | 30 | 90 | 0;

interface Bucket {
  week: string;
  count: number;
}

function formatWeek(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AnalyticsCharts() {
  const [range, setRange] = useState<DateRange>(30);
  const [userBuckets, setUserBuckets] = useState<Bucket[]>([]);
  const [popBuckets, setPopBuckets] = useState<Bucket[]>([]);
  const [revPopcycles, setRevPopcycles] = useState<{ title: string; prize_pool_cents: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const days = range === 0 ? 3650 : range; // "all time" = ~10 years
    Promise.all([
      fetchAnalyticsTimeSeries("users", days),
      fetchAnalyticsTimeSeries("pops", days),
      fetchRevenuePerPopcycle(),
    ]).then(([usersResult, popsResult, revResult]) => {
      setUserBuckets(usersResult.buckets ?? []);
      setPopBuckets(popsResult.buckets ?? []);
      setRevPopcycles(revResult.popcycles ?? []);
      setLoading(false);
    });
  }, [range]);

  return (
    <div>
      {/* Date range filter */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text)]">Time Range:</span>
        {([
          [7, "7 days"],
          [30, "30 days"],
          [90, "90 days"],
          [0, "All time"],
        ] as [DateRange, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setRange(val)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              range === val
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading charts...</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <BarChart title="Users Over Time" data={userBuckets} color="bg-blue-500" />
          <BarChart title="Pops Over Time" data={popBuckets} color="bg-purple-500" />
          <RevenueChart title="Revenue per Popcycle" data={revPopcycles} />
        </div>
      )}
    </div>
  );
}

function BarChart({ title, data, color }: { title: string; data: Bucket[]; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-secondary)]">
          No data for this period.
        </div>
      ) : (
        <div className="flex h-48 items-end gap-1">
          {data.map((bucket) => {
            const heightPct = (bucket.count / max) * 100;
            return (
              <div key={bucket.week} className="group flex flex-1 flex-col items-center">
                <div className="relative w-full">
                  <div
                    className={`w-full rounded-t ${color} transition-all`}
                    style={{ height: `${Math.max(heightPct * 1.8, 2)}px` }}
                    title={`${formatWeek(bucket.week)}: ${bucket.count}`}
                  />
                </div>
                <span className="mt-1 text-[10px] text-[var(--color-text-secondary)] hidden group-hover:block">
                  {bucket.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {data.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] text-[var(--color-text-secondary)]">
          <span>{formatWeek(data[0]?.week ?? "")}</span>
          <span>Total: {data.reduce((s: number, d: any) => s + d.count, 0).toLocaleString()}</span>
          <span>{formatWeek(data[data.length - 1]?.week ?? "")}</span>
        </div>
      )}
    </div>
  );
}

function RevenueChart({
  title,
  data,
}: {
  title: string;
  data: { title: string; prize_pool_cents: number }[];
}) {
  const max = Math.max(...data.map((d) => d.prize_pool_cents), 1);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-secondary)]">
          No completed popcycles yet.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((pc) => {
            const pct = (pc.prize_pool_cents / max) * 100;
            return (
              <div key={pc.title}>
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-[var(--color-text)]">{pc.title}</span>
                  <span className="ml-2 font-mono text-[var(--color-text-secondary)]">
                    {formatCents(pc.prize_pool_cents)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
