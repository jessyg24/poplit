import { z } from "zod";
import { GENRES, MOODS, TRIGGER_WARNINGS, STORY_LIMITS } from "../constants";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = loginSchema.extend({
  pen_name: z
    .string()
    .min(3, "Pen name must be at least 3 characters")
    .max(30, "Pen name must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Pen name can only contain letters, numbers, hyphens, and underscores"),
  display_name: z.string().max(50).optional(),
  gdpr_consent: z.literal(true, { errorMap: () => ({ message: "You must accept the privacy policy" }) }),
});

export const onboardingSchema = z.object({
  display_name: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
});

// Story submission
export const storySubmissionSchema = z.object({
  title: z.string().min(1, "Title is required").max(STORY_LIMITS.titleMaxLength),
  hook: z.string().min(1, "Hook is required").max(STORY_LIMITS.hookMaxLength),
  genre: z.enum(GENRES as unknown as [string, ...string[]]),
  mood: z.enum(MOODS as unknown as [string, ...string[]]).optional(),
  triggers: z.array(z.enum(TRIGGER_WARNINGS as unknown as [string, ...string[]])).default([]),
  content: z
    .string()
    .min(1, "Story content is required")
    .refine(
      (val) => {
        const wordCount = val.trim().split(/\s+/).length;
        return wordCount >= STORY_LIMITS.minWords;
      },
      { message: `Story must be at least ${STORY_LIMITS.minWords} words` },
    )
    .refine(
      (val) => {
        const wordCount = val.trim().split(/\s+/).length;
        return wordCount <= STORY_LIMITS.maxWords;
      },
      { message: `Story must be at most ${STORY_LIMITS.maxWords} words` },
    ),
  popcycle_id: z.string().uuid(),
});

// Comment
export const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000),
  parent_id: z.string().uuid().optional(),
});

// Message
export const messageSchema = z.object({
  receiver_id: z.string().uuid(),
  body: z.string().min(1, "Message cannot be empty").max(5000),
});

// Report
export const reportSchema = z.object({
  target_type: z.enum(["story", "user", "comment"]),
  target_id: z.string().uuid(),
  reason: z.string().min(1, "Reason is required").max(200),
  details: z.string().max(2000).optional(),
});

// Admin: Popcycle creation
export const popcycleSchema = z.object({
  title: z.string().min(1).max(100),
  prompt: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  format: z.enum(["standard", "flash", "themed", "sponsored"]),
  submissions_open_at: z.string().datetime(),
  submissions_close_at: z.string().datetime(),
  reading_open_at: z.string().datetime(),
  reading_close_at: z.string().datetime(),
  popoff_at: z.string().datetime(),
  entry_fee_cents: z.number().int().min(0),
  winner_pct: z.number().int().min(0).max(100),
  runner_up_pct: z.number().int().min(0).max(100),
  wildcard_pct: z.number().int().min(0).max(100),
  sponsor_name: z.string().optional(),
  sponsor_logo_url: z.string().url().optional(),
});

// Profile update
export const profileUpdateSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
});

// Feature bubble
export const featureBubbleSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
});

// Types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type StorySubmissionInput = z.infer<typeof storySubmissionSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type PopcycleInput = z.infer<typeof popcycleSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type FeatureBubbleInput = z.infer<typeof featureBubbleSchema>;
