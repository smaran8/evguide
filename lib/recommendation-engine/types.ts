/**
 * lib/recommendation-engine/types.ts
 *
 * Input and output contracts for the consultation-based recommendation engine.
 * This engine is separate from lib/scoring/recommendation.ts (which powers the
 * AI Match wizard). Do not merge them.
 */

import type { EVModel } from "@/types";
import type { ConsultationFormState } from "@/types/consultation";

// ── Engine input ──────────────────────────────────────────────────────────────

export type { ConsultationFormState };

// ── Per-dimension raw scores ──────────────────────────────────────────────────

export interface ScoringBreakdown {
  /** Max 25 — price inside budget window */
  budget_fit: number;
  /** Max 15 — body type matches preference */
  body_type_fit: number;
  /** Max 20 — real-world range vs daily mileage */
  range_fit: number;
  /** Max 15 — home / public charging compatibility */
  charging_fit: number;
  /** Max 15 — estimated monthly cost vs target */
  monthly_cost_fit: number;
  /** Max 10 — vehicle traits align with motivation */
  motivation_fit: number;
}

export const MAX_SCORES: ScoringBreakdown = {
  budget_fit: 25,
  body_type_fit: 15,
  range_fit: 20,
  charging_fit: 15,
  monthly_cost_fit: 15,
  motivation_fit: 10,
};

// ── Per-vehicle intermediate result ──────────────────────────────────────────

export interface ScoredVehicle {
  vehicle: EVModel;
  totalScore: number;
  breakdown: ScoringBreakdown;
  reasons: string[];
  tradeoffs: string[];
  estimated_monthly_cost: number;
  charging_fit_summary: string;
  savings_summary: string;
}

// ── Final recommendation output (top 3) ──────────────────────────────────────

export interface RecommendationOutput {
  rank: 1 | 2 | 3;
  vehicle: EVModel;
  /** 0–100 composite match score */
  match_score: number;
  breakdown: ScoringBreakdown;
  /** Up to 4 plain-English reasons why this EV fits */
  reasons: string[];
  /** 1–2 honest caveats the user should weigh */
  tradeoffs: string[];
  /** All-in monthly estimate: finance + energy + insurance + servicing */
  estimated_monthly_cost: number;
  /** One-line charging fit summary */
  charging_fit_summary: string;
  /** One-line savings vs petrol summary */
  savings_summary: string;
  /** Only populated for rank === 1 */
  explanation?: string;
}

// ── API layer ─────────────────────────────────────────────────────────────────

export interface RunRecommendationRequest {
  consultation_id: string;
  session_id?: string | null;
  /** Pass the full state client-side so the server doesn't need a DB round-trip */
  state: ConsultationFormState;
}

export interface RunRecommendationResponse {
  recommendation_id: string | null;
  results: RecommendationOutput[];
}
