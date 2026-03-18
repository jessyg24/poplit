"use client";

import { useState, useEffect, useTransition } from "react";
import { loadPlatformSettings, savePlatformSettings } from "../actions";
import {
  SCORING_WEIGHTS,
  MIN_READ_TIME_MS,
  RATE_LIMITS,
  AI_DETECTION_THRESHOLD,
  SECTION_WEIGHTS,
} from "@poplit/core/constants";

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-text)] mb-1";

// Fallback defaults from constants
const DEFAULTS: Record<string, number> = {
  popsPerMinute: RATE_LIMITS.popsPerMinute,
  commentsPerMinute: RATE_LIMITS.commentsPerMinute,
  messagesPerMinute: RATE_LIMITS.messagesPerMinute,
  submissionsPerPopcycle: RATE_LIMITS.submissionsPerPopcycle,
  minReadTimeMs: MIN_READ_TIME_MS,
  aiDetectionThreshold: AI_DETECTION_THRESHOLD,
  accountAgeWeight: SCORING_WEIGHTS.accountAge.weight,
  completionRateWeight: SCORING_WEIGHTS.completionRate.weight,
  activityLevelWeight: SCORING_WEIGHTS.activityLevel.weight,
  badgeCountWeight: SCORING_WEIGHTS.badgeCount.weight,
  contestHistoryWeight: SCORING_WEIGHTS.contestHistory.weight,
  multiplierFloor: SCORING_WEIGHTS.multiplierFloor,
  multiplierCeiling: SCORING_WEIGHTS.multiplierCeiling,
  section1Weight: SECTION_WEIGHTS[1],
  section2Weight: SECTION_WEIGHTS[2],
  section3Weight: SECTION_WEIGHTS[3],
  section4Weight: SECTION_WEIGHTS[4],
  section5Weight: SECTION_WEIGHTS[5],
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    loadPlatformSettings().then((result) => {
      if (result.settings && typeof result.settings === "object") {
        const loaded = result.settings as Record<string, number>;
        setSettings((prev) => ({ ...prev, ...loaded }));
      }
      setLoading(false);
    });
  }, []);

  function updateSetting(key: string, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setStatus(null);
  }

  function handleSave() {
    setStatus(null);
    startTransition(async () => {
      const result = await savePlatformSettings(settings);
      if (result.error) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({ type: "success", message: "Settings saved successfully." });
      }
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Platform Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Platform Settings</h1>

      <div className="space-y-8">
        {/* Rate Limits */}
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Rate Limits</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Pops per Minute</label>
              <input
                type="number"
                value={settings.popsPerMinute}
                onChange={(e) => updateSetting("popsPerMinute", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Comments per Minute</label>
              <input
                type="number"
                value={settings.commentsPerMinute}
                onChange={(e) => updateSetting("commentsPerMinute", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Messages per Minute</label>
              <input
                type="number"
                value={settings.messagesPerMinute}
                onChange={(e) => updateSetting("messagesPerMinute", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Submissions per Popcycle</label>
              <input
                type="number"
                value={settings.submissionsPerPopcycle}
                onChange={(e) => updateSetting("submissionsPerPopcycle", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        {/* Read Time & AI */}
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Detection & Timing</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Min Read Time (ms)</label>
              <input
                type="number"
                value={settings.minReadTimeMs}
                onChange={(e) => updateSetting("minReadTimeMs", Number(e.target.value))}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {((settings.minReadTimeMs ?? 0) / 1000).toFixed(0)}s per section
              </p>
            </div>
            <div>
              <label className={labelClass}>AI Detection Threshold</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.aiDetectionThreshold}
                onChange={(e) => updateSetting("aiDetectionThreshold", Number(e.target.value))}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Stories scoring above this are flagged ({((settings.aiDetectionThreshold ?? 0) * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
        </section>

        {/* Scoring Weights */}
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Reader Multiplier Weights</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            These weights determine the reader quality multiplier. Must sum to 1.0.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Account Age ({settings.accountAgeWeight})</label>
              <input
                type="number"
                step="0.05"
                value={settings.accountAgeWeight}
                onChange={(e) => updateSetting("accountAgeWeight", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Completion Rate ({settings.completionRateWeight})</label>
              <input
                type="number"
                step="0.05"
                value={settings.completionRateWeight}
                onChange={(e) => updateSetting("completionRateWeight", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Activity Level ({settings.activityLevelWeight})</label>
              <input
                type="number"
                step="0.05"
                value={settings.activityLevelWeight}
                onChange={(e) => updateSetting("activityLevelWeight", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Badge Count ({settings.badgeCountWeight})</label>
              <input
                type="number"
                step="0.05"
                value={settings.badgeCountWeight}
                onChange={(e) => updateSetting("badgeCountWeight", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contest History ({settings.contestHistoryWeight})</label>
              <input
                type="number"
                step="0.05"
                value={settings.contestHistoryWeight}
                onChange={(e) => updateSetting("contestHistoryWeight", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Sum: {(
              (settings.accountAgeWeight ?? 0) +
              (settings.completionRateWeight ?? 0) +
              (settings.activityLevelWeight ?? 0) +
              (settings.badgeCountWeight ?? 0) +
              (settings.contestHistoryWeight ?? 0)
            ).toFixed(2)}
            {" "}(should be 1.00)
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Multiplier Floor</label>
              <input
                type="number"
                step="0.01"
                value={settings.multiplierFloor}
                onChange={(e) => updateSetting("multiplierFloor", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Multiplier Ceiling</label>
              <input
                type="number"
                step="0.01"
                value={settings.multiplierCeiling}
                onChange={(e) => updateSetting("multiplierCeiling", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        {/* Section Weights */}
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Section Pop Weights</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Higher sections are weighted more to reward story completion.
          </p>
          <div className="grid grid-cols-5 gap-3">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <div key={n}>
                <label className={labelClass}>Section {n}</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings[`section${n}Weight`]}
                  onChange={(e) => updateSetting(`section${n}Weight`, Number(e.target.value))}
                  className={fieldClass}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving..." : "Save Settings"}
          </button>
          {status?.type === "success" && (
            <span className="text-sm text-green-600">{status.message}</span>
          )}
          {status?.type === "error" && (
            <span className="text-sm text-red-600">{status.message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
