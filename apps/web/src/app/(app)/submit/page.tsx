"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  storySubmissionSchema,
  type StorySubmissionInput,
} from "@poplit/core/validation";
import {
  GENRES,
  MOODS,
  TRIGGER_WARNINGS,
  STORY_LIMITS,
  ENTRY_FEE_CENTS,
} from "@poplit/core/constants";
import { countWords, formatCents } from "@poplit/core/utils";

export default function SubmitPage() {
  const [preview, setPreview] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StorySubmissionInput>({
    resolver: zodResolver(storySubmissionSchema),
    defaultValues: {
      triggers: [],
    },
  });

  const hookValue = watch("hook") ?? "";
  const contentValue = watch("content") ?? "";
  const wordCount = contentValue ? countWords(contentValue) : 0;

  async function onSubmit(data: StorySubmissionInput) {
    // TODO: Implement payment flow + story creation
    console.log("Submit story:", data);
    alert("Payment flow coming soon! Story data logged to console.");
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow";
  const labelClass = "block text-sm font-medium mb-1.5";
  const errorClass = "mt-1 text-sm text-red-500";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Submit Your Story
        </h1>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors"
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {preview ? (
        <PreviewMode
          title={watch("title")}
          hook={hookValue}
          genre={watch("genre")}
          mood={watch("mood")}
          triggers={watch("triggers")}
          content={contentValue}
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Title
            </label>
            <input
              id="title"
              type="text"
              {...register("title")}
              className={inputClass}
              placeholder="Your story title"
              maxLength={STORY_LIMITS.titleMaxLength}
            />
            {errors.title && (
              <p className={errorClass}>{errors.title.message}</p>
            )}
          </div>

          {/* Hook */}
          <div>
            <label htmlFor="hook" className={labelClass}>
              Hook
            </label>
            <textarea
              id="hook"
              rows={3}
              {...register("hook")}
              className={inputClass + " resize-none"}
              placeholder="A compelling one-liner to draw readers in..."
              maxLength={STORY_LIMITS.hookMaxLength}
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
              {errors.hook ? (
                <p className="text-red-500">{errors.hook.message}</p>
              ) : (
                <span />
              )}
              <span
                className={
                  hookValue.length > STORY_LIMITS.hookMaxLength * 0.9
                    ? "text-red-500"
                    : ""
                }
              >
                {hookValue.length}/{STORY_LIMITS.hookMaxLength}
              </span>
            </div>
          </div>

          {/* Genre */}
          <div>
            <label htmlFor="genre" className={labelClass}>
              Genre
            </label>
            <select id="genre" {...register("genre")} className={inputClass}>
              <option value="">Select a genre</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errors.genre && (
              <p className={errorClass}>{errors.genre.message}</p>
            )}
          </div>

          {/* Mood */}
          <div>
            <label htmlFor="mood" className={labelClass}>
              Mood{" "}
              <span className="text-[var(--color-text-secondary)] font-normal">
                (optional)
              </span>
            </label>
            <select id="mood" {...register("mood")} className={inputClass}>
              <option value="">None</option>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Warnings */}
          <div>
            <label className={labelClass}>
              Trigger Warnings{" "}
              <span className="text-[var(--color-text-secondary)] font-normal">
                (select all that apply)
              </span>
            </label>
            <Controller
              name="triggers"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2 mt-1">
                  {TRIGGER_WARNINGS.map((tw) => {
                    const selected = field.value?.includes(tw);
                    return (
                      <button
                        key={tw}
                        type="button"
                        onClick={() => {
                          const current = field.value ?? [];
                          field.onChange(
                            selected
                              ? current.filter((t) => t !== tw)
                              : [...current, tw],
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]"
                        }`}
                      >
                        {tw}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className={labelClass}>
              Story Content
            </label>
            <textarea
              id="content"
              rows={16}
              {...register("content")}
              className={inputClass + " resize-y font-mono text-sm leading-relaxed"}
              placeholder="Write your story here... It will be automatically split into 5 sections for readers."
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
              {errors.content ? (
                <p className="text-red-500">{errors.content.message}</p>
              ) : (
                <span />
              )}
              <span
                className={
                  wordCount < STORY_LIMITS.minWords
                    ? "text-amber-500"
                    : wordCount > STORY_LIMITS.maxWords
                      ? "text-red-500"
                      : "text-green-500"
                }
              >
                {wordCount.toLocaleString()} / {STORY_LIMITS.minWords.toLocaleString()}-{STORY_LIMITS.maxWords.toLocaleString()} words
              </span>
            </div>
          </div>

          {/* Popcycle ID (hidden - would be populated by active popcycle) */}
          <input type="hidden" {...register("popcycle_id")} />

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Submitting..."
              : `Pay ${formatCents(ENTRY_FEE_CENTS)} to Submit`}
          </button>
          <p className="text-center text-xs text-[var(--color-text-secondary)]">
            Your story will be reviewed before publishing. Payment is
            non-refundable.
          </p>
        </form>
      )}
    </div>
  );
}

function PreviewMode({
  title,
  hook,
  genre,
  mood,
  triggers,
  content,
}: {
  title: string;
  hook: string;
  genre: string;
  mood?: string;
  triggers: string[];
  content: string;
}) {
  return (
    <div className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div>
        <h2 className="text-xl font-bold">{title || "Untitled"}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)] italic">
          {hook || "No hook yet..."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {genre && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-accent)] text-white">
            {genre}
          </span>
        )}
        {mood && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-[var(--color-border)]">
            {mood}
          </span>
        )}
        {triggers.map((tw) => (
          <span
            key={tw}
            className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
          >
            {tw}
          </span>
        ))}
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {content || "Start writing to see a preview..."}
      </div>
    </div>
  );
}
