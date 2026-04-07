/**
 * lib/actions/recommendations.ts
 *
 * Server actions for the recommendation engine.
 *
 * "use server" at the top of this file tells Next.js that every exported
 * function here runs on the server — they can safely use DB credentials
 * and never expose secrets to the browser.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTopRecommendations } from "@/lib/scoring/recommendation";
import { getAllEVs } from "@/lib/evs";
import { getBrandDemandCandidates } from "@/lib/vehicle-sources";
import { upsertFinancialProfileFromRecommendation } from "@/lib/profiling/financial-profile";
import { refreshIntentProfileForIdentity } from "@/lib/profiling/intent-profile";
import { evModels as localEvModels } from "@/data/evModels";
import type { UserPreferences, RecommendationResult } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types for action return values
// ─────────────────────────────────────────────────────────────────────────────

export type RecommendActionResult = {
  results: RecommendationResult[];
  preferenceId: string | null;
  error?: string;
};

export type HistoryItem = {
  preferenceId: string;
  createdAt: string;
  topEv: string;
  score: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Input validation helpers
// Always validate at the action boundary — the client should never be trusted
// for numeric inputs that drive business logic.
// ─────────────────────────────────────────────────────────────────────────────

function validatePreferences(prefs: UserPreferences): string | null {
  if (prefs.monthlyIncome <= 0)       return "Monthly income must be positive.";
  if (prefs.totalBudget <= 0)         return "Total budget must be positive.";
  if (prefs.downPayment < 0)          return "Down payment cannot be negative.";
  if (prefs.downPayment >= prefs.totalBudget) return "Down payment must be less than total budget.";
  if (prefs.preferredMonthlyEmi <= 0) return "Preferred monthly EMI must be positive.";
  if (prefs.familySize < 1 || prefs.familySize > 10) return "Family size must be between 1 and 10.";
  if (!["city", "highway", "mixed"].includes(prefs.usageType)) return "Invalid usage type.";
  if (!["home", "public", "none"].includes(prefs.chargingAccess)) return "Invalid charging access.";
  if (!["suv", "hatchback", "sedan", "any"].includes(prefs.preferredBodyType)) return "Invalid body type.";
  return null; // no error
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 1: getRecommendations
// Runs the scoring engine and persists the session to Supabase.
// Called from the client-side RecommendationForm component.
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecommendations(
  prefs: UserPreferences,
): Promise<RecommendActionResult> {
  // 1. Validate inputs at the server boundary
  const validationError = validatePreferences(prefs);
  if (validationError) {
    return { results: [], preferenceId: null, error: validationError };
  }

  try {
    // 2. Fetch EV candidates with brand-first strategy:
    //    BYD/Tesla/Omoda live APIs -> DB brand rows -> local brand rows.
    const [{ candidates: brandCandidates }, dbEVs] = await Promise.all([
      getBrandDemandCandidates(prefs),
      getAllEVs(),
    ]);

    const dbBrandCandidates = dbEVs.filter(
      (ev) => ev.brand === "BYD" || ev.brand === "Tesla" || ev.brand === "Omoda",
    );

    const localBrandCandidates = localEvModels.filter(
      (ev) => ev.brand === "BYD" || ev.brand === "Tesla" || ev.brand === "Omoda",
    );

    const candidates =
      brandCandidates.length > 0
        ? brandCandidates
        : dbBrandCandidates.length > 0
          ? dbBrandCandidates
          : localBrandCandidates;

    // 3. Run the pure scoring engine (no DB calls inside, fast)
    const results = getTopRecommendations(prefs, candidates);

    if (results.length === 0) {
      return {
        results: [],
        preferenceId: null,
        error: "No EVs matched your criteria. Try increasing your budget or changing preferences.",
      };
    }

    // 4. Get current user (optional — works for anonymous users too)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 5. Use admin client for DB writes to bypass RLS for anonymous inserts
    const admin = createAdminClient();

    // Optional financial profiling from explicit recommendation-form inputs.
    // After updating the financial profile, rebuild the unified intent profile
    // so it picks up both the new affordability band and the body-type preference
    // that was just submitted in this form.
    if (user?.id) {
      await upsertFinancialProfileFromRecommendation({
        userId: user.id,
        totalBudget: prefs.totalBudget,
        preferredMonthlyEmi: prefs.preferredMonthlyEmi,
        downPayment: prefs.downPayment,
      });
      await refreshIntentProfileForIdentity({
        userId: user.id,
        sessionId: null,
      });
    }

    const { data: prefRow, error: prefError } = await admin
      .from("user_preferences")
      .insert({
        user_id:               user?.id ?? null,
        monthly_income:        prefs.monthlyIncome,
        total_budget:          prefs.totalBudget,
        down_payment:          prefs.downPayment,
        preferred_monthly_emi: prefs.preferredMonthlyEmi,
        usage_type:            prefs.usageType,
        family_size:           prefs.familySize,
        charging_access:       prefs.chargingAccess,
        preferred_body_type:   prefs.preferredBodyType,
      })
      .select("id")
      .single();

    if (prefError) {
      // DB save failed — still return results so the user sees their recommendations
      console.error("[recommendations] Failed to save preferences:", prefError.message);
      return { results, preferenceId: null };
    }

    // 6. Save each of the top-3 results as separate rows
    const recRows = results.map((r) => ({
      preference_id: prefRow.id,
      user_id:       user?.id ?? null,
      ev_id:         r.ev.id,
      ev_brand:      r.ev.brand,
      ev_model_name: r.ev.model,
      score:         r.score,
      rank:          r.rank,
      estimated_emi: r.estimatedEmi,
      reasons:       r.reasons,
    }));

    await admin.from("recommendations").insert(recRows);

    return { results, preferenceId: prefRow.id };
  } catch (err) {
    console.error("[recommendations] Unexpected error:", err);
    return {
      results:      [],
      preferenceId: null,
      error:        "Something went wrong. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 2: getRecommendationHistory
// Returns the user's 10 most recent recommendation sessions.
// Only works for logged-in users (returns [] for anonymous).
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecommendationHistory(): Promise<HistoryItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("recommendations")
    .select("preference_id, ev_brand, ev_model_name, score, created_at")
    .eq("user_id", user.id)
    .eq("rank", 1) // Only fetch the best match for each session summary
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map((row) => ({
    preferenceId: row.preference_id,
    createdAt:    row.created_at,
    topEv:        `${row.ev_brand} ${row.ev_model_name}`,
    score:        row.score,
  }));
}
