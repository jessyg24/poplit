export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "user" | "admin";
export type StoryStatus = "draft" | "pending_review" | "ai_flagged" | "approved" | "rejected" | "published" | "archived";
export type PopcycleStatus = "draft" | "scheduled" | "submissions_open" | "reading_open" | "popoff" | "completed";
export type PopcycleFormat = "standard" | "flash" | "themed" | "sponsored";
export type ReportTarget = "story" | "user" | "comment";
export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed";
export type StrikeStatus = "active" | "appealed" | "reversed" | "expired";
export type SubscriptionTier = "monthly" | "annual";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
export type NotificationType =
  | "pop_milestone"
  | "badge_earned"
  | "popoff_result"
  | "new_follower"
  | "new_comment"
  | "new_message"
  | "story_approved"
  | "story_rejected"
  | "strike_issued"
  | "wildcard_win"
  | "anthology_selected";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          pen_name: string;
          real_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          role: UserRole;
          stripe_customer_id: string | null;
          stripe_connect_id: string | null;
          gdpr_consent: boolean;
          gdpr_consent_at: string | null;
          watch_list: boolean;
          watch_list_reason: string | null;
          invite_code: string;
          invited_by: string | null;
          entry_credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      stories: {
        Row: {
          id: string;
          author_id: string;
          popcycle_id: string;
          title: string;
          hook: string;
          genre: string;
          mood: string | null;
          triggers: string[];
          section_1: string;
          section_2: string;
          section_3: string;
          section_4: string;
          section_5: string;
          word_count: number;
          status: StoryStatus;
          ai_score: number | null;
          ai_flagged: boolean;
          ai_review_note: string | null;
          ai_assisted: boolean;
          ai_disclaimer: boolean;
          ai_disclaimer_source: "self_disclosed" | "auto_flagged" | null;
          payment_intent_id: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["stories"]["Row"], "id" | "created_at" | "updated_at" | "ai_score" | "ai_flagged" | "ai_review_note" | "published_at" | "status"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          ai_score?: number | null;
          ai_flagged?: boolean;
          ai_review_note?: string | null;
          ai_assisted?: boolean;
          ai_disclaimer?: boolean;
          ai_disclaimer_source?: "self_disclosed" | "auto_flagged" | null;
          published_at?: string | null;
          status?: StoryStatus;
        };
        Update: Partial<Database["public"]["Tables"]["stories"]["Insert"]>;
      };
      popcycles: {
        Row: {
          id: string;
          title: string;
          prompt_theme: string;
          prompt_1: string;
          prompt_2: string;
          prompt_3: string;
          prompt_4: string;
          prompt_5: string;
          description: string | null;
          format: PopcycleFormat;
          status: PopcycleStatus;
          submissions_open_at: string;
          submissions_close_at: string;
          reading_open_at: string;
          reading_close_at: string;
          popoff_at: string;
          entry_fee_cents: number;
          prize_pool_cents: number;
          house_pct: number;
          first_pct: number;
          second_pct: number;
          third_pct: number;
          sponsor_name: string | null;
          sponsor_logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["popcycles"]["Row"], "id" | "created_at" | "updated_at" | "prize_pool_cents"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          prize_pool_cents?: number;
        };
        Update: Partial<Database["public"]["Tables"]["popcycles"]["Insert"]>;
      };
      pops: {
        Row: {
          id: string;
          reader_id: string;
          story_id: string;
          section_opened: number;
          weighted_value: number;
          read_duration_ms: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pops"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pops"]["Insert"]>;
      };
      scores: {
        Row: {
          id: string;
          story_id: string;
          popcycle_id: string;
          raw_score: number;
          display_score: number;
          total_readers: number;
          section_1_reads: number;
          section_2_reads: number;
          section_3_reads: number;
          section_4_reads: number;
          section_5_reads: number;
          completion_rate: number;
          reaction_score: number;
          rank: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["scores"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scores"]["Insert"]>;
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          criteria: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["badges"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_badges"]["Row"], "id" | "earned_at"> & {
          id?: string;
          earned_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_badges"]["Insert"]>;
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["follows"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
      };
      comments: {
        Row: {
          id: string;
          story_id: string;
          user_id: string;
          parent_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at" | "read_at"> & {
          id?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTarget;
          target_id: string;
          reason: string;
          details: string | null;
          status: ReportStatus;
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_note: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at" | "status" | "resolved_by" | "resolved_at" | "resolution_note"> & {
          id?: string;
          created_at?: string;
          status?: ReportStatus;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
      };
      strikes: {
        Row: {
          id: string;
          user_id: string;
          issued_by: string;
          reason: string;
          evidence: string | null;
          status: StrikeStatus;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["strikes"]["Row"], "id" | "created_at" | "status"> & {
          id?: string;
          created_at?: string;
          status?: StrikeStatus;
        };
        Update: Partial<Database["public"]["Tables"]["strikes"]["Insert"]>;
      };
      anthology_entries: {
        Row: {
          id: string;
          story_id: string;
          popcycle_id: string;
          quarter: string;
          selected_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["anthology_entries"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["anthology_entries"]["Insert"]>;
      };
      feature_bubbles: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: string;
          poke_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feature_bubbles"]["Row"], "id" | "created_at" | "updated_at" | "poke_count"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          poke_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["feature_bubbles"]["Insert"]>;
      };
      feature_pokes: {
        Row: {
          id: string;
          feature_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feature_pokes"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feature_pokes"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: SubscriptionTier;
          status: SubscriptionStatus;
          stripe_subscription_id: string;
          current_period_start: string;
          current_period_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["subscriptions"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at" | "read_at"> & {
          id?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      reactions: {
        Row: {
          id: string;
          reader_id: string;
          story_id: string;
          section: number;
          start_offset: number;
          end_offset: number;
          reaction_type: "up" | "down";
          text_snippet: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reactions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reactions"]["Insert"]>;
      };
      rankings: {
        Row: {
          id: string;
          popcycle_id: string;
          story_id: string;
          author_id: string;
          rank: number;
          prize_amount: number;
          raw_score: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["rankings"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rankings"]["Insert"]>;
      };
      platform_settings: {
        Row: {
          id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          settings: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      story_status: StoryStatus;
      popcycle_status: PopcycleStatus;
      popcycle_format: PopcycleFormat;
      report_target: ReportTarget;
      report_status: ReportStatus;
      strike_status: StrikeStatus;
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
      notification_type: NotificationType;
    };
  };
}

// Convenience row types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Story = Database["public"]["Tables"]["stories"]["Row"];
export type Popcycle = Database["public"]["Tables"]["popcycles"]["Row"];
export type Pop = Database["public"]["Tables"]["pops"]["Row"];
export type Score = Database["public"]["Tables"]["scores"]["Row"];
export type Badge = Database["public"]["Tables"]["badges"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Strike = Database["public"]["Tables"]["strikes"]["Row"];
export type AnthologyEntry = Database["public"]["Tables"]["anthology_entries"]["Row"];
export type FeatureBubble = Database["public"]["Tables"]["feature_bubbles"]["Row"];
export type FeaturePoke = Database["public"]["Tables"]["feature_pokes"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type Ranking = Database["public"]["Tables"]["rankings"]["Row"];
