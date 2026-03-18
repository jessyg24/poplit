"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@poplit/core/validation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OAuthProvider = "google" | "apple" | "facebook";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [inviteCode, setInviteCode] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("ref") ?? "";
    }
    return "";
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      gdpr_consent: undefined,
    },
  });

  async function onSubmit(data: SignupInput) {
    setServerError(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          pen_name: data.pen_name,
          real_name: data.real_name ?? data.pen_name,
          ...(inviteCode.trim() ? { invited_by: inviteCode.trim().toUpperCase() } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    if (error) {
      setServerError(error.message);
    } else {
      setEmailSent(true);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setServerError(null);
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setServerError(error.message);
      setOauthLoading(null);
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
            We sent a confirmation link to your email address. Click it to
            activate your account.
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
            Join{" "}
            <span className="text-[var(--color-primary)]">PopLit</span>
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Create your free account and start reading
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          {(
            [
              { provider: "google" as const, label: "Google" },
              { provider: "apple" as const, label: "Apple" },
              { provider: "facebook" as const, label: "Facebook" },
            ] as const
          ).map(({ provider, label }) => (
            <button
              key={provider}
              type="button"
              disabled={isSubmitting || oauthLoading !== null}
              onClick={() => handleOAuth(provider)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] font-medium hover:bg-[var(--color-background)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oauthLoading === provider ? "Redirecting..." : `Continue with ${label}`}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[var(--color-background)] px-4 text-[var(--color-text-secondary)]">
              or sign up with email
            </span>
          </div>
        </div>

        {/* Signup Form */}
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

          <div>
            <label
              htmlFor="pen_name"
              className="block text-sm font-medium mb-1.5"
            >
              Pen Name
            </label>
            <input
              id="pen_name"
              type="text"
              autoComplete="username"
              {...register("pen_name")}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow"
              placeholder="your-pen-name"
            />
            {errors.pen_name && (
              <p className="mt-1 text-sm text-red-500">
                {errors.pen_name.message}
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="invite_code"
              className="block text-sm font-medium mb-1.5"
            >
              Invite Code <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
            </label>
            <input
              id="invite_code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow uppercase tracking-widest text-center font-mono"
              placeholder="ABC123"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Have a friend on PopLit? Enter their code and you both get a free entry credit!
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="gdpr_consent"
              type="checkbox"
              {...register("gdpr_consent")}
              className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
            />
            <label
              htmlFor="gdpr_consent"
              className="text-sm text-[var(--color-text-secondary)]"
            >
              I agree to the{" "}
              <Link
                href="/privacy"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
              >
                Terms of Service
              </Link>
            </label>
          </div>
          {errors.gdpr_consent && (
            <p className="text-sm text-red-500">
              {errors.gdpr_consent.message}
            </p>
          )}

          {serverError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || oauthLoading !== null}
            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-[var(--color-text-secondary)]">
          Already have an account?{" "}
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
