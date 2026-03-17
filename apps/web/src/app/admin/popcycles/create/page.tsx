"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { popcycleSchema, type PopcycleInput } from "@poplit/core/validation";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@poplit/core/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-text)] mb-1";
const errorClass = "mt-1 text-xs text-red-500";

export default function CreatePopcyclePage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PopcycleInput>({
    resolver: zodResolver(popcycleSchema),
    defaultValues: {
      format: "standard",
      entry_fee_cents: 100,
      winner_pct: 70,
      runner_up_pct: 15,
      wildcard_pct: 10,
    },
  });

  async function onSubmit(data: PopcycleInput) {
    setSubmitting(true);
    setSubmitError(null);

    const supabase = getSupabase();
    const { error } = await supabase.from("popcycles").insert({
      ...data,
      status: "draft",
    });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/admin/popcycles");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Create Popcycle</h1>

      {submitError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className={labelClass}>Title</label>
          <input id="title" {...register("title")} className={fieldClass} placeholder="Weekly Flash Fiction #12" />
          {errors.title && <p className={errorClass}>{errors.title.message}</p>}
        </div>

        {/* Prompt */}
        <div>
          <label htmlFor="prompt" className={labelClass}>Prompt</label>
          <textarea id="prompt" {...register("prompt")} className={fieldClass} rows={3} placeholder="Write a story about..." />
          {errors.prompt && <p className={errorClass}>{errors.prompt.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>Description (optional)</label>
          <textarea id="description" {...register("description")} className={fieldClass} rows={2} />
          {errors.description && <p className={errorClass}>{errors.description.message}</p>}
        </div>

        {/* Format */}
        <div>
          <label htmlFor="format" className={labelClass}>Format</label>
          <select id="format" {...register("format")} className={fieldClass}>
            <option value="standard">Standard</option>
            <option value="flash">Flash</option>
            <option value="themed">Themed</option>
            <option value="sponsored">Sponsored</option>
          </select>
          {errors.format && <p className={errorClass}>{errors.format.message}</p>}
        </div>

        {/* Date fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="submissions_open_at" className={labelClass}>Submissions Open</label>
            <input id="submissions_open_at" type="datetime-local" {...register("submissions_open_at")} className={fieldClass} />
            {errors.submissions_open_at && <p className={errorClass}>{errors.submissions_open_at.message}</p>}
          </div>
          <div>
            <label htmlFor="submissions_close_at" className={labelClass}>Submissions Close</label>
            <input id="submissions_close_at" type="datetime-local" {...register("submissions_close_at")} className={fieldClass} />
            {errors.submissions_close_at && <p className={errorClass}>{errors.submissions_close_at.message}</p>}
          </div>
          <div>
            <label htmlFor="reading_open_at" className={labelClass}>Reading Opens</label>
            <input id="reading_open_at" type="datetime-local" {...register("reading_open_at")} className={fieldClass} />
            {errors.reading_open_at && <p className={errorClass}>{errors.reading_open_at.message}</p>}
          </div>
          <div>
            <label htmlFor="reading_close_at" className={labelClass}>Reading Closes</label>
            <input id="reading_close_at" type="datetime-local" {...register("reading_close_at")} className={fieldClass} />
            {errors.reading_close_at && <p className={errorClass}>{errors.reading_close_at.message}</p>}
          </div>
          <div>
            <label htmlFor="popoff_at" className={labelClass}>Pop-Off Date</label>
            <input id="popoff_at" type="datetime-local" {...register("popoff_at")} className={fieldClass} />
            {errors.popoff_at && <p className={errorClass}>{errors.popoff_at.message}</p>}
          </div>
        </div>

        {/* Financial fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="entry_fee_cents" className={labelClass}>Entry Fee (cents)</label>
            <input id="entry_fee_cents" type="number" {...register("entry_fee_cents", { valueAsNumber: true })} className={fieldClass} />
            {errors.entry_fee_cents && <p className={errorClass}>{errors.entry_fee_cents.message}</p>}
          </div>
          <div>
            <label htmlFor="winner_pct" className={labelClass}>Winner %</label>
            <input id="winner_pct" type="number" {...register("winner_pct", { valueAsNumber: true })} className={fieldClass} />
            {errors.winner_pct && <p className={errorClass}>{errors.winner_pct.message}</p>}
          </div>
          <div>
            <label htmlFor="runner_up_pct" className={labelClass}>Runner-Up %</label>
            <input id="runner_up_pct" type="number" {...register("runner_up_pct", { valueAsNumber: true })} className={fieldClass} />
            {errors.runner_up_pct && <p className={errorClass}>{errors.runner_up_pct.message}</p>}
          </div>
          <div>
            <label htmlFor="wildcard_pct" className={labelClass}>Wildcard %</label>
            <input id="wildcard_pct" type="number" {...register("wildcard_pct", { valueAsNumber: true })} className={fieldClass} />
            {errors.wildcard_pct && <p className={errorClass}>{errors.wildcard_pct.message}</p>}
          </div>
        </div>

        {/* Sponsor fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sponsor_name" className={labelClass}>Sponsor Name (optional)</label>
            <input id="sponsor_name" {...register("sponsor_name")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="sponsor_logo_url" className={labelClass}>Sponsor Logo URL (optional)</label>
            <input id="sponsor_logo_url" {...register("sponsor_logo_url")} className={fieldClass} placeholder="https://..." />
            {errors.sponsor_logo_url && <p className={errorClass}>{errors.sponsor_logo_url.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
        >
          {submitting ? "Creating..." : "Create Popcycle"}
        </button>
      </form>
    </div>
  );
}
