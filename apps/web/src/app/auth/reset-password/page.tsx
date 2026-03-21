"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ResetInput = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    // @ts-expect-error -- zodResolver deep type instantiation exceeds TS limit
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(data: ResetInput) {
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) {
      setServerError(error.message);
    } else {
      setEmailSent(true);
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-bold mx-auto">
            !
          </div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-[var(--color-text-secondary)]">
            If an account exists with that email, we sent a password reset link.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-4 text-[var(--color-primary)] font-medium hover:text-[var(--color-primary-hover)] transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {serverError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* Back to login */}
        <p className="text-center text-[var(--color-text-secondary)]">
          Remember your password?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--color-primary)] font-medium hover:text-[var(--color-primary-hover)] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
