// ─────────────────────────────────────────────────────────────────────────────
// Consultation Wizard — form state, step config, and API types
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums / option values ─────────────────────────────────────────────────────

export type EvReason =
  | "save_money"
  | "family_use"
  | "environment"
  | "technology"
  | "performance"
  | "brand_status";

export type ChargingSpeedImportance = "low" | "medium" | "high";

export type RangePriority = "low" | "medium" | "high";

export type PerformancePriority = "low" | "medium" | "high";

// ── Wizard form state ─────────────────────────────────────────────────────────

export interface ConsultationFormState {
  // Step 1 — Reason
  main_reason_for_ev: EvReason | "";

  // Step 2 — Budget
  budget_min_gbp: number | null;
  budget_max_gbp: number | null;
  target_monthly_payment_gbp: number | null;

  // Step 3 — Usage
  daily_miles: number | null;
  weekly_miles: number | null;
  yearly_miles: number | null;
  family_size: number | null;

  // Step 4 — Charging
  home_charging: boolean | null;
  public_charging_ok: boolean | null;
  charging_speed_importance: ChargingSpeedImportance | null;

  // Step 5 — Preferences
  body_type_preference: string | null;
  brand_preference: string[];
  range_priority: RangePriority | null;
  performance_priority: PerformancePriority | null;
  notes: string;
}

export const EMPTY_CONSULTATION: ConsultationFormState = {
  main_reason_for_ev: "",
  budget_min_gbp: null,
  budget_max_gbp: null,
  target_monthly_payment_gbp: null,
  daily_miles: null,
  weekly_miles: null,
  yearly_miles: null,
  family_size: null,
  home_charging: null,
  public_charging_ok: null,
  charging_speed_importance: null,
  body_type_preference: null,
  brand_preference: [],
  range_priority: null,
  performance_priority: null,
  notes: "",
};

// ── Step config ───────────────────────────────────────────────────────────────

export interface ConsultationStepConfig {
  id: number;
  title: string;
  subtitle: string;
  /** Used in consultation_answers.question_key for the step summary answer. */
  answerKey: string;
}

export const CONSULTATION_STEPS: ConsultationStepConfig[] = [
  {
    id: 1,
    title: "Why are you going electric?",
    subtitle: "This helps us understand what matters most when matching you to a car.",
    answerKey: "main_reason_for_ev",
  },
  {
    id: 2,
    title: "What's your budget?",
    subtitle: "Give us a range — we'll find EVs that fit comfortably within it.",
    answerKey: "budget",
  },
  {
    id: 3,
    title: "How do you use your car?",
    subtitle: "Mileage and family size help us match range and space requirements.",
    answerKey: "usage",
  },
  {
    id: 4,
    title: "What's your charging setup?",
    subtitle: "Charging access is one of the biggest factors in EV fit.",
    answerKey: "charging",
  },
  {
    id: 5,
    title: "Any preferences we should know?",
    subtitle: "All optional — skip anything that doesn't apply to you.",
    answerKey: "preferences",
  },
];

// ── API types ─────────────────────────────────────────────────────────────────

export interface CreateConsultationPayload {
  session_id?: string | null;
}

export interface CreateConsultationResult {
  id: string;
}

export interface UpdateConsultationPayload {
  main_reason_for_ev?: string | null;
  budget_min_gbp?: number | null;
  budget_max_gbp?: number | null;
  target_monthly_payment_gbp?: number | null;
  daily_miles?: number | null;
  weekly_miles?: number | null;
  yearly_miles?: number | null;
  family_size?: number | null;
  home_charging?: boolean | null;
  public_charging_ok?: boolean | null;
  body_type_preference?: string | null;
  brand_preference?: string[] | null;
  range_priority?: string | null;
  performance_priority?: string | null;
  notes?: string | null;
  answers?: ConsultationAnswerPayload[];
}

export interface ConsultationAnswerPayload {
  question_key: string;
  step_number: number;
  answer_text?: string | null;
  answer_number?: number | null;
  answer_boolean?: boolean | null;
  answer_json?: unknown;
}
