import { z } from "zod";
import { GENRES, MOODS, TRIGGER_WARNINGS, STORY_LIMITS, MAX_GENRES_PER_STORY } from "../constants";

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
  real_name: z.string().max(50).optional(),
  gdpr_consent: z.literal(true, { errorMap: () => ({ message: "You must accept the privacy policy" }) }),
});

export const onboardingSchema = z.object({
  real_name: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().max(50).optional(),
});

// Story draft (saving/editing drafts — no popcycle required)
export const storyDraftSchema = z.object({
  title: z.string().min(1, "Title is required").max(STORY_LIMITS.titleMaxLength),
  hook: z.string().max(STORY_LIMITS.hookMaxLength).optional(),
  genre: z
    .array(z.enum(GENRES as unknown as [string, ...string[]]))
    .min(1, "At least one genre is required")
    .max(MAX_GENRES_PER_STORY, `Maximum ${MAX_GENRES_PER_STORY} genres`),
  mood: z.enum(MOODS as unknown as [string, ...string[]]).optional(),
  triggers: z.array(z.enum(TRIGGER_WARNINGS as unknown as [string, ...string[]])).default([]),
  content: z.string().optional(),
  ai_assisted: z.boolean().default(false),
});

// Story submission (submitting a draft to a Popcycle)
export const storySubmissionSchema = z.object({
  draft_id: z.string().uuid(),
  popcycle_id: z.string().uuid(),
  predecessor_id: z.string().uuid().optional(),
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
  prompt_theme: z.string().min(1, "Theme is required").max(200),
  prompt_1: z.string().min(1, "Prompt 1 is required").max(500),
  prompt_2: z.string().min(1, "Prompt 2 is required").max(500),
  prompt_3: z.string().min(1, "Prompt 3 is required").max(500),
  prompt_4: z.string().min(1, "Prompt 4 is required").max(500),
  prompt_5: z.string().min(1, "Prompt 5 is required").max(500),
  description: z.string().max(1000).optional(),
  format: z.enum(["standard", "flash", "themed", "sponsored"]),
  submissions_open_at: z.string().datetime(),
  submissions_close_at: z.string().datetime(),
  reading_open_at: z.string().datetime(),
  reading_close_at: z.string().datetime(),
  popoff_at: z.string().datetime(),
  entry_fee_cents: z.number().int().min(0),
  house_pct: z.number().int().min(0).max(100).default(15),
  first_pct: z.number().int().min(0).max(100).default(65),
  second_pct: z.number().int().min(0).max(100).default(12),
  third_pct: z.number().int().min(0).max(100).default(5),
  sponsor_name: z.string().optional(),
  sponsor_logo_url: z.string().url().optional(),
});

// Profile update
export const publishedWorkSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  url: z.string().url("Must be a valid URL").max(500),
  store: z.string().min(1, "Store is required").max(50),
});

export const profileUpdateSchema = z.object({
  real_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().max(50).optional(),
  published_works: z.array(publishedWorkSchema).max(10).optional(),
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
export type StoryDraftInput = z.infer<typeof storyDraftSchema>;
export type StorySubmissionInput = z.infer<typeof storySubmissionSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type PopcycleInput = z.infer<typeof popcycleSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type FeatureBubbleInput = z.infer<typeof featureBubbleSchema>;
