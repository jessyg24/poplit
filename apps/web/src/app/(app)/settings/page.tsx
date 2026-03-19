"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@poplit/core/validation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AvatarPicker } from "@/components/ui/Avatar";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { published_works: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "published_works",
  });

  // Load existing profile data
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("real_name, bio, avatar_url, published_works")
        .eq("id", user.id)
        .single();
      if (profile) {
        reset({
          real_name: profile.real_name ?? "",
          bio: profile.bio ?? "",
          avatar_url: profile.avatar_url ?? "",
          published_works: (profile.published_works as any[]) ?? [],
        });
      }
    })();
  }, [supabase, reset]);

  async function onUpdateProfile(data: ProfileUpdateInput) {
    setServerError(null);
    setSuccessMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setServerError("Not authenticated");
      return;
    }

    // Filter out undefined/empty fields
    const updates: Record<string, unknown> = {};
    if (data.real_name) updates.real_name = data.real_name;
    if (data.bio !== undefined) updates.bio = data.bio ?? "";
    if (data.avatar_url) updates.avatar_url = data.avatar_url;
    if (data.published_works !== undefined) updates.published_works = data.published_works;

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      setServerError(error.message);
    } else {
      setSuccessMsg("Profile updated successfully.");
      router.refresh();
    }
  }

  async function handleChangePassword() {
    setServerError(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(
      (await supabase.auth.getUser()).data.user?.email ?? "",
      { redirectTo: `${window.location.origin}/auth/reset-password` },
    );

    if (error) {
      setServerError(error.message);
    } else {
      setSuccessMsg("Password reset email sent. Check your inbox.");
    }
  }

  async function handleExportData() {
    setExportLoading(true);
    setServerError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch user data for GDPR export
      const [
        { data: profile },
        { data: stories },
        { data: pops },
        { data: comments },
        { data: follows },
      ] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase.from("stories").select("*").eq("author_id", user.id),
        supabase.from("pops").select("*").eq("reader_id", user.id),
        supabase.from("comments").select("*").eq("user_id", user.id),
        supabase.from("follows").select("*").eq("follower_id", user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile,
        stories,
        reading_history: pops,
        comments,
        follows,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poplit-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Export failed",
      );
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setServerError(null);

    // First export data, then delete
    await handleExportData();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Anonymize user data (soft delete)
    const { error } = await supabase
      .from("users")
      .update({
        pen_name: `deleted_${user.id.slice(0, 8)}`,
        real_name: "Deleted User",
        bio: null,
        avatar_url: null,
        email: `deleted_${user.id}@poplit.local`,
      })
      .eq("id", user.id);

    if (error) {
      setServerError(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow";
  const labelClass = "block text-sm font-medium mb-1.5";
  const errorTextClass = "mt-1 text-sm text-red-500";

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20 lg:pb-0">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      {/* Success / Error messages */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm text-green-600 dark:text-green-400">
          {successMsg}
        </div>
      )}
      {serverError && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {serverError}
        </div>
      )}

      {/* Profile Update */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-lg font-bold mb-4">Profile</h2>
        <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
          <div>
            <label htmlFor="real_name" className={labelClass}>
              Real Name
            </label>
            <input
              id="real_name"
              type="text"
              {...register("real_name")}
              className={inputClass}
              placeholder="Your real name"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Used for payment and authorship verification. Not shown publicly.
            </p>
            {errors.real_name && (
              <p className={errorTextClass}>{errors.real_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="bio" className={labelClass}>
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              {...register("bio")}
              className={inputClass + " resize-none"}
              placeholder="Tell readers about yourself..."
            />
            {errors.bio && (
              <p className={errorTextClass}>{errors.bio.message}</p>
            )}
          </div>

          <Controller
            name="avatar_url"
            control={control}
            render={({ field }) => (
              <AvatarPicker
                value={field.value}
                onChange={(id) => field.onChange(id)}
              />
            )}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Published Works */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Published Works</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Link your books so readers can find them. Links are verified before display.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
              No published works added yet.
            </p>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-[var(--color-border)] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Book {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className={labelClass}>Book Title</label>
                <input
                  type="text"
                  {...register(`published_works.${index}.title`)}
                  className={inputClass}
                  placeholder="My Amazing Novel"
                />
                {errors.published_works?.[index]?.title && (
                  <p className={errorTextClass}>
                    {errors.published_works[index].title.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Store</label>
                <select
                  {...register(`published_works.${index}.store`)}
                  className={inputClass}
                >
                  <option value="">Select a store</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Barnes & Noble">Barnes &amp; Noble</option>
                  <option value="Bookshop.org">Bookshop.org</option>
                  <option value="Apple Books">Apple Books</option>
                  <option value="Google Play Books">Google Play Books</option>
                  <option value="Kobo">Kobo</option>
                  <option value="IndieBound">IndieBound</option>
                  <option value="Other">Other</option>
                </select>
                {errors.published_works?.[index]?.store && (
                  <p className={errorTextClass}>
                    {errors.published_works[index].store.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Link URL</label>
                <input
                  type="url"
                  {...register(`published_works.${index}.url`)}
                  className={inputClass}
                  placeholder="https://www.amazon.com/dp/..."
                />
                {errors.published_works?.[index]?.url && (
                  <p className={errorTextClass}>
                    {errors.published_works[index].url.message}
                  </p>
                )}
              </div>
            </div>
          ))}

          {fields.length < 10 && (
            <button
              type="button"
              onClick={() => append({ title: "", url: "", store: "" })}
              className="w-full py-2.5 rounded-xl border border-dashed border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              + Add Published Work
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Published Works"}
          </button>
        </form>
      </section>

      {/* Account Actions */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <h2 className="text-lg font-bold">Account</h2>

        <button
          type="button"
          onClick={handleChangePassword}
          className="w-full py-3 rounded-xl border border-[var(--color-border)] font-medium hover:bg-[var(--color-background)] transition-colors"
        >
          Change Password
        </button>

        <button
          type="button"
          onClick={handleExportData}
          disabled={exportLoading}
          className="w-full py-3 rounded-xl border border-[var(--color-border)] font-medium hover:bg-[var(--color-background)] transition-colors disabled:opacity-50"
        >
          {exportLoading ? "Exporting..." : "Export My Data (GDPR)"}
        </button>

        <div className="pt-4 border-t border-[var(--color-border)]">
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="w-full py-3 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                This will anonymize your account data and sign you out. Your
                stories will remain but be attributed to &quot;Deleted
                User&quot;. A data export will be downloaded automatically.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-[var(--color-border)] font-medium hover:bg-[var(--color-background)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
