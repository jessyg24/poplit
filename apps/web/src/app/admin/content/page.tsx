import { GENRES, MOODS, TRIGGER_WARNINGS } from "@poplit/core/constants";

export default async function ContentPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Content Management</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Genre Taxonomy */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Genre Taxonomy</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Current genres defined in the codebase. To add/remove genres, update the GENRES constant in @poplit/core/constants.
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <span
                key={genre}
                className="inline-block rounded-full bg-[var(--color-primary)] bg-opacity-10 px-3 py-1 text-sm font-medium text-[var(--color-primary)]"
              >
                {genre}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">{GENRES.length} genres</p>
        </div>

        {/* Moods */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Moods</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Story mood tags available for writers.
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((mood) => (
              <span
                key={mood}
                className="inline-block rounded-full bg-[var(--color-accent)] bg-opacity-10 px-3 py-1 text-sm font-medium text-[var(--color-accent)]"
              >
                {mood}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">{MOODS.length} moods</p>
        </div>

        {/* Trigger Warnings */}
        <div className="col-span-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Trigger Warnings</h2>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Content warnings that writers can tag on their stories. Readers see these before opening a story.
          </p>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_WARNINGS.map((tw) => (
              <span
                key={tw}
                className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
              >
                {tw}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">{TRIGGER_WARNINGS.length} trigger warnings</p>
        </div>
      </div>

      {/* TODO: Add ability to manage genres/moods/triggers via database instead of constants */}
      <div className="mt-6 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-700">
        Genre, mood, and trigger warning lists are currently defined as constants in @poplit/core.
        To make them admin-editable, migrate to a database-backed taxonomy table.
      </div>
    </div>
  );
}
