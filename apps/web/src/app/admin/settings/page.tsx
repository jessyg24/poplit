"use client";

import { useState } from "react";
import { SCORING_WEIGHTS, MIN_READ_TIME_MS, RATE_LIMITS, AI_DETECTION_THRESHOLD, SECTION_WEIGHTS } from "@poplit/core/constants";

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-text)] mb-1";

export default function SettingsPage() {
  // Initialize with current constants - TODO: Load from platform_settings table
  const [settings, setSettings] = useState({
    // Rate limits
    popsPerMinute: RATE_LIMITS.popsPerMinute,
    commentsPerMinute: RATE_LIMITS.commentsPerMinute,
    messagesPerMinute: RATE_LIMITS.messagesPerMinute,
    submissionsPerPopcycle: RATE_LIMITS.submissionsPerPopcycle,

    // Min read time
    minReadTimeMs: MIN_READ_TIME_MS,

    // AI detection
    aiDetectionThreshold: AI_DETECTION_THRESHOLD,

    // Scoring weights
    accountAgeWeight: SCORING_WEIGHTS.accountAge.weight,
    completionRateWeight: SCORING_WEIGHTS.completionRate.weight,
    activityLevelWeight: SCORING_WEIGHTS.activityLevel.weight,
    badgeCountWeight: SCORING_WEIGHTS.badgeCount.weight,
    contestHistoryWeight: SCORING_WEIGHTS.contestHistory.weight,
    multiplierFloor: SCORING_WEIGHTS.multiplierFloor,
    multiplierCeiling: SCORING_WEIGHTS.multiplierCeiling,

    // Section weights
    section1Weight: SECTION_WEIGHTS[1],
    section2Weight: SECTION_WEIGHTS[2],
    section3Weight: SECTION_WEIGHTS[3],
    section4Weight: SECTION_WEIGHTS[4],
    section5Weight: SECTION_WEIGHTS[5],
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSetting(key: keyof typeof settings, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    // TODO: Save to platform_settings table in Supabase
    // const supabase = createBrowserClient(...)
    // await supabase.from("platform_settings").upsert({ key: "settings", value: settings })
    await new Promise((r) => setTimeout(r, 500)); // Simulate save
    setSaving(false);
    setSaved(true);
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
                {(settings.minReadTimeMs / 1000).toFixed(0)}s per section
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
                Stories scoring above this are flagged ({(settings.aiDetectionThreshold * 100).toFixed(0)}%)
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
              settings.accountAgeWeight +
              settings.completionRateWeight +
              settings.activityLevelWeight +
              settings.badgeCountWeight +
              settings.contestHistoryWeight
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
                  value={settings[`section${n}Weight` as keyof typeof settings]}
                  onChange={(e) => updateSetting(`section${n}Weight` as keyof typeof settings, Number(e.target.value))}
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
            disabled={saving}
            className="rounded-md bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && <span className="text-sm text-green-600">Settings saved (placeholder).</span>}
        </div>

        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-700">
          TODO: These settings are currently loaded from constants. Implement a platform_settings table to persist admin changes to the database.
        </div>
      </div>
    </div>
  );
}
