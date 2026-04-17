// ─────────────────────────────────────────────────────────────────────────────
// AI Platform Foundation — Database Row Types
// Mirrors: supabase/manual/011_ai_platform_foundation.sql
//
// Convention:
//   *Row   = shape of a row as returned from Supabase (snake_case, nullable
//            columns typed as T | null).
//   *Insert = payload for creating a new row (omits generated/defaulted fields).
// ─────────────────────────────────────────────────────────────────────────────


// ── 1. profiles ──────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  city?: string | null;
  country?: string | null;
}


// ── 2. anonymous_visitors ────────────────────────────────────────────────────

export interface AnonymousVisitorRow {
  id: string;
  anonymous_id: string;
  first_seen_at: string;
  last_seen_at: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

export interface AnonymousVisitorInsert {
  anonymous_id: string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  referrer?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
}


// ── 3. user_sessions ─────────────────────────────────────────────────────────

export interface UserSessionRow {
  id: string;
  anonymous_visitor_id: string | null;
  profile_id: string | null;
  session_token: string;
  started_at: string;
  ended_at: string | null;
  landing_page: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

export interface UserSessionInsert {
  session_token: string;
  anonymous_visitor_id?: string | null;
  profile_id?: string | null;
  landing_page?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  referrer?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
}


// ── 4. vehicles ──────────────────────────────────────────────────────────────

export type VehicleStatus = "active" | "inactive" | "coming_soon";

export interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  slug: string;
  body_type: string | null;
  price_gbp: number | null;
  battery_kwh: number | null;
  wltp_range_miles: number | null;
  efficiency_mi_per_kwh: number | null;
  charging_ac_kw: number | null;
  charging_dc_kw: number | null;
  charge_time_ac_hours: number | null;
  charge_time_dc_10_80_mins: number | null;
  seats: number | null;
  drivetrain: string | null;
  image_url: string | null;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleInsert {
  brand: string;
  model: string;
  slug: string;
  variant?: string | null;
  body_type?: string | null;
  price_gbp?: number | null;
  battery_kwh?: number | null;
  wltp_range_miles?: number | null;
  efficiency_mi_per_kwh?: number | null;
  charging_ac_kw?: number | null;
  charging_dc_kw?: number | null;
  charge_time_ac_hours?: number | null;
  charge_time_dc_10_80_mins?: number | null;
  seats?: number | null;
  drivetrain?: string | null;
  image_url?: string | null;
  status?: VehicleStatus;
}


// ── 5. user_events ───────────────────────────────────────────────────────────
// NOTE: If migrating from the legacy user_events table (which used event_type,
// car_id, event_value jsonb), the legacy table should be renamed to
// tracking_events before this new table is created. See migration notes.

export interface PlatformEventRow {
  id: number; // bigserial
  session_id: string | null;
  profile_id: string | null;
  anonymous_visitor_id: string | null;
  event_name: string;
  page_path: string | null;
  vehicle_id: string | null;
  metadata: Record<string, unknown>;
  event_value: number | null;
  created_at: string;
}

export interface PlatformEventInsert {
  event_name: string;
  session_id?: string | null;
  profile_id?: string | null;
  anonymous_visitor_id?: string | null;
  page_path?: string | null;
  vehicle_id?: string | null;
  metadata?: Record<string, unknown>;
  event_value?: number | null;
}


// ── 6. consultations ─────────────────────────────────────────────────────────

export interface ConsultationRow {
  id: string;
  session_id: string | null;
  profile_id: string | null;
  anonymous_visitor_id: string | null;
  budget_min_gbp: number | null;
  budget_max_gbp: number | null;
  target_monthly_payment_gbp: number | null;
  body_type_preference: string | null;
  daily_miles: number | null;
  weekly_miles: number | null;
  yearly_miles: number | null;
  home_charging: boolean | null;
  public_charging_ok: boolean | null;
  main_reason_for_ev: string | null;
  range_priority: string | null;
  performance_priority: string | null;
  family_size: number | null;
  brand_preference: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface ConsultationInsert {
  session_id?: string | null;
  profile_id?: string | null;
  anonymous_visitor_id?: string | null;
  budget_min_gbp?: number | null;
  budget_max_gbp?: number | null;
  target_monthly_payment_gbp?: number | null;
  body_type_preference?: string | null;
  daily_miles?: number | null;
  weekly_miles?: number | null;
  yearly_miles?: number | null;
  home_charging?: boolean | null;
  public_charging_ok?: boolean | null;
  main_reason_for_ev?: string | null;
  range_priority?: string | null;
  performance_priority?: string | null;
  family_size?: number | null;
  brand_preference?: string[] | null;
  notes?: string | null;
}


// ── 7. consultation_answers ──────────────────────────────────────────────────

export interface ConsultationAnswerRow {
  id: string;
  consultation_id: string;
  question_key: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_json: unknown | null;
  step_number: number | null;
  created_at: string;
}

export interface ConsultationAnswerInsert {
  consultation_id: string;
  question_key: string;
  answer_text?: string | null;
  answer_number?: number | null;
  answer_boolean?: boolean | null;
  answer_json?: unknown | null;
  step_number?: number | null;
}


// ── 8. ai_recommendations ────────────────────────────────────────────────────

export interface AiRecommendationRow {
  id: string;
  consultation_id: string;
  session_id: string | null;
  profile_id: string | null;
  recommended_vehicle_ids: string[];
  primary_vehicle_id: string | null;
  recommendation_payload: Record<string, unknown>;
  explanation: string | null;
  confidence_score: number | null;
  created_at: string;
}

export interface AiRecommendationInsert {
  consultation_id: string;
  recommended_vehicle_ids: string[];
  recommendation_payload: Record<string, unknown>;
  session_id?: string | null;
  profile_id?: string | null;
  primary_vehicle_id?: string | null;
  explanation?: string | null;
  confidence_score?: number | null;
}


// ── 9. finance_requests ──────────────────────────────────────────────────────

export type FinanceRequestStatus = "new" | "reviewing" | "approved" | "rejected" | "converted";

export interface FinanceRequestRow {
  id: string;
  session_id: string | null;
  profile_id: string | null;
  consultation_id: string | null;
  vehicle_id: string | null;
  deposit_gbp: number | null;
  desired_term_months: number | null;
  estimated_income_band: string | null;
  target_monthly_budget_gbp: number | null;
  employment_status: string | null;
  credit_self_rating: string | null;
  status: FinanceRequestStatus;
  created_at: string;
}

export interface FinanceRequestInsert {
  session_id?: string | null;
  profile_id?: string | null;
  consultation_id?: string | null;
  vehicle_id?: string | null;
  deposit_gbp?: number | null;
  desired_term_months?: number | null;
  estimated_income_band?: string | null;
  target_monthly_budget_gbp?: number | null;
  employment_status?: string | null;
  credit_self_rating?: string | null;
  status?: FinanceRequestStatus;
}


// ── 10. lead_scores ──────────────────────────────────────────────────────────

export type LeadScoreCategory = "cold" | "warm" | "hot" | "finance_ready";

export interface LeadScoreRow {
  id: string;
  session_id: string;
  profile_id: string | null;
  consultation_id: string | null;
  score: number;
  category: LeadScoreCategory;
  scoring_reasons: ScoringReason[];
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScoringReason {
  rule: string;
  points: number;
  label: string;
}

export interface LeadScoreInsert {
  session_id: string;
  score: number;
  profile_id?: string | null;
  consultation_id?: string | null;
  category?: LeadScoreCategory;
  scoring_reasons?: ScoringReason[];
}


// ── 11. lead_pipeline ────────────────────────────────────────────────────────

export type LeadPipelineStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "converted"
  | "lost";

export type LeadPipelinePriority = "low" | "normal" | "high" | "urgent";

export interface LeadPipelineRow {
  id: string;
  profile_id: string | null;
  consultation_id: string | null;
  finance_request_id: string | null;
  assigned_to: string | null;
  stage: LeadPipelineStage;
  priority: LeadPipelinePriority;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export interface LeadPipelineInsert {
  profile_id?: string | null;
  consultation_id?: string | null;
  finance_request_id?: string | null;
  assigned_to?: string | null;
  stage?: LeadPipelineStage;
  priority?: LeadPipelinePriority;
  notes?: string | null;
}


// ── 12. recommendation_feedback ──────────────────────────────────────────────

export type FeedbackType =
  | "selected"
  | "rejected"
  | "saved"
  | "shared"
  | "test_drive_requested";

export interface RecommendationFeedbackRow {
  id: string;
  recommendation_id: string;
  profile_id: string | null;
  selected_vehicle_id: string | null;
  feedback_type: FeedbackType | null;
  feedback_note: string | null;
  created_at: string;
}

export interface RecommendationFeedbackInsert {
  recommendation_id: string;
  profile_id?: string | null;
  selected_vehicle_id?: string | null;
  feedback_type?: FeedbackType | null;
  feedback_note?: string | null;
}
