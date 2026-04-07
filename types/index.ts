export type EVNewsItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  readTime?: string;
  publishedAt?: string;
  image: string;
  url: string;
};

export interface EVModel {
  id: string;
  brand: string;
  model: string;
  heroImage: string;
  tier: VehicleTier;
  price: number;
  motorCapacityKw: number;
  torqueNm: number;
  groundClearanceMm: number;
  tyreSize: string;
  batteryKWh: number;
  rangeKm: number;
  drive: string;
  chargingStandard: string;
  fastChargeTime: string;
  adas: string;
  warranty: string;
  seats: number;
  bootLitres: number;
  topSpeedKph: number;
  acceleration: string;
  description: string;
  bestFor: string;
  lovedReason: string;
  /** Optional body type override stored in DB / set by admin */
  bodyType?: string | null;
  /** Optional admin-assigned badge tag e.g. "Best Value", "Long Range" */
  badge?: string | null;
  /** DB-driven popularity score (higher = more popular) */
  popularityScore?: number;
}

export interface BankFacility {
  label: string;
  value: string;
}

export interface BankOffer {
  id: string;
  bank: string;
  interestRate: number;
  maxTenureYears: number;
  maxLtvPercent: number;
  processingFee: string;
  tag: string;
  facilities?: string[];
  terms?: BankFacility[];
}

export interface OfferFormState {
  fullName: string;
  email: string;
  preferredTime: string;
  consent: boolean;
  notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — AI Recommendation Engine
// ─────────────────────────────────────────────────────────────────────────────

/** How the user primarily drives — affects range scoring */
export type UsageType = "city" | "highway" | "mixed";

/** Where the user can charge — affects charging network scoring */
export type ChargingAccess = "home" | "public" | "none";

/** Body style preference — used as a multiplier on final score */
export type BodyType = "suv" | "hatchback" | "sedan" | "any";

/**
 * All inputs collected from the recommendation wizard form.
 * These are saved to the `user_preferences` table in Supabase.
 */
export interface UserPreferences {
  monthlyIncome: number;
  totalBudget: number;
  downPayment: number;
  preferredMonthlyEmi: number;
  usageType: UsageType;
  familySize: number;
  chargingAccess: ChargingAccess;
  preferredBodyType: BodyType;
}

/**
 * A single EV recommendation with scoring metadata.
 * This is the output of the scoring engine for one candidate EV.
 */
export interface RecommendationResult {
  ev: EVModel;
  /** 0–100 composite score */
  score: number;
  /** Position in the top-3: 1 = best match */
  rank: 1 | 2 | 3;
  /** Estimated monthly EMI in £ */
  estimatedEmi: number;
  /** Up to 4 human-readable reasons explaining why this EV was recommended */
  reasons: string[];
}

/**
 * A complete recommendation session — preferences + results together.
 * Used when displaying recommendation history to logged-in users.
 */
export interface RecommendationSession {
  preferenceId: string;
  userId: string | null;
  preferences: UserPreferences;
  results: RecommendationResult[];
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — User Event Tracking Foundation
// ─────────────────────────────────────────────────────────────────────────────

export type UserEventType =
  | "page_view"
  | "car_view"
  | "vehicle_view"
  | "engagement_milestone"
  | "recommendation_started"
  | "recommendation_completed"
  | "emi_used"
  | "compare_clicked"
  | "price_filter_used"
  | "filter_used"
  | "loan_offer_clicked"
  | "repeat_visit"
  | "consultation_started"
  | "consultation_submitted"
  | "test_drive_clicked"
  | "finance_apply_clicked"
  | "reserve_clicked"
  | "sort_changed"
  | "save_clicked"
  | "tier_section_viewed"
  | "search_used";

export interface TrackEventInput {
  eventType: UserEventType;
  carId?: string | null;
  eventValue?: Record<string, unknown> | null;
  pagePath?: string;
}

export interface UserEventRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  car_id: string | null;
  event_type: UserEventType;
  event_value: Record<string, unknown> | null;
  page_path: string;
  created_at: string;
}

export type LeadUserType = "casual" | "research" | "buyer";

export interface LeadScoreRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  score: number;
  user_type: LeadUserType;
  predicted_buy_window: string;
  interested_car_id: string | null;
  last_activity_at: string;
  updated_at: string;
}

export interface UserCarInterestRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  car_id: string;
  first_seen_at: string;
  last_seen_at: string;
  total_views_per_car: number;
  high_interest: boolean;
  updated_at: string;
}

export type AffordabilityBand = "entry" | "mid" | "premium";

export type InferredBuyerStyle =
  | "analytical_buyer"
  | "emotional_buyer"
  | "price_sensitive_buyer"
  | "urgent_buyer";

export interface UserFinancialProfileRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  preferred_budget_min: number | null;
  preferred_budget_max: number | null;
  preferred_emi: number | null;
  preferred_down_payment: number | null;
  estimated_affordability_band: AffordabilityBand;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Unified User Intent Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface UserIntentProfileRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  /** 0–100 composite intent score, sourced from lead_scores */
  intent_score: number;
  /** Buyer classification, sourced from lead_scores */
  user_type: LeadUserType;
  /** Human-readable buy window estimate, sourced from lead_scores */
  predicted_buy_window: string;
  /** Affordability segment, sourced from user_financial_profiles */
  estimated_affordability_band: AffordabilityBand;
  /** Car the user has shown the most repeated interest in */
  strongest_interest_car_id: string | null;
  /** Brand derived from strongest_interest_car_id via local evModels lookup */
  favorite_brand: string | null;
  /** Body type from user_preferences (logged-in users only) */
  favorite_body_type: string | null;
  /** Total event count for this identity */
  visit_count: number;
  /** Number of times the EMI calculator was used */
  emi_usage_count: number;
  /** Number of compare_clicked events */
  compare_count: number;
  /** Soft inferred style from behavior rules (never deterministic) */
  inferred_buyer_style: InferredBuyerStyle | null;
  /** 0..1 confidence for the inferred style */
  inferred_buyer_style_confidence: number | null;
  /** Human-readable explanation of the rule hit */
  inferred_buyer_style_reason: string | null;
  last_activity_at: string | null;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8 — Dealer Lead Intelligence Dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The enriched row that the dealer lead table consumes.
 * Built server-side by joining user_intent_profiles with a local evModels lookup
 * so the client component receives plain, pre-resolved data.
 */
export interface LeadIntelligenceRow {
  id: string;
  /** Obfuscated identifier shown in the UI — masked user UUID or shortened session id */
  displayId: string;
  /** Whether this is a registered user or anonymous session */
  isAuthenticated: boolean;
  intent_score: number;
  user_type: LeadUserType;
  predicted_buy_window: string;
  estimated_affordability_band: AffordabilityBand;
  /** Human-readable car label, e.g. "BYD Atto 3" — null if no car interest exists */
  strongestCarLabel: string | null;
  strongest_interest_car_id: string | null;
  favorite_brand: string | null;
  favorite_body_type: string | null;
  visit_count: number;
  emi_usage_count: number;
  compare_count: number;
  inferred_buyer_style: InferredBuyerStyle | null;
  inferred_buyer_style_confidence: number | null;
  inferred_buyer_style_reason: string | null;
  last_activity_at: string | null;
}

export type VehicleTier = "affordable" | "mid" | "premium";

export type VehicleListingSegment = "casual" | "interested" | "high_intent";

export interface VehicleListingFilters {
  budgetMax: number | null;
  rangeMin: number | null;
  brand: string | null;
  emiMax: number | null;
}

export type AllVehiclesSortOption =
  | "recommended"
  | "price_low"
  | "price_high"
  | "range"
  | "newest"
  | "best_value";

export interface AllVehiclesFilters {
  search: string;
  budgetMin: number | null;
  budgetMax: number | null;
  rangeMin: number | null;
  brand: string | null;
  bodyType: string | null;
  seats: number | null;
  batteryMin: number | null;
  emiMax: number | null;
  sort: AllVehiclesSortOption;
}

export interface PersonalizedVehicleCard extends EVModel {
  estimatedEmi: number;
  whyRecommended: string;
  recommendationScore: number;
  /** Auto-computed or admin-assigned display badge */
  displayBadge?: string | null;
}

export type CrmLeadStatus =
  | "new"
  | "qualified"
  | "nurture"
  | "hot"
  | "contacted"
  | "follow_up"
  | "converted"
  | "closed_lost";

export type CrmLeadPriority = "low" | "medium" | "high" | "urgent";

export type CrmJourneyStage =
  | "awareness"
  | "research"
  | "comparison"
  | "finance"
  | "conversion";

export interface CrmLeadRecordRow {
  id: string;
  profile_id: string;
  status: CrmLeadStatus;
  priority: CrmLeadPriority;
  owner_name: string | null;
  tags: string[] | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  qualification_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmLeadNoteRow {
  id: string;
  profile_id: string;
  author_user_id: string | null;
  body: string;
  created_at: string;
}

export type TestDriveBookingStatus =
  | "requested"
  | "reviewing"
  | "scheduled"
  | "completed"
  | "cancelled";

export interface TestDriveBookingRow {
  id: string;
  profile_id: string | null;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  ev_model_id: string | null;
  ev_model_label: string | null;
  preferred_date: string;
  preferred_time_slot: string;
  preferred_location: string;
  current_vehicle: string | null;
  notes: string | null;
  status: TestDriveBookingStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmLeadListRow extends LeadIntelligenceRow {
  journey_stage: CrmJourneyStage;
  journey_stage_reason: string;
  total_page_views: number;
  total_conversion_events: number;
  primary_paths: string[];
  crm_status: CrmLeadStatus;
  crm_priority: CrmLeadPriority;
  crm_owner_name: string | null;
  crm_tags: string[];
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
}
