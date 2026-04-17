/**
 * POST /api/recommendations
 *
 * Runs the consultation recommendation engine, saves the output to
 * ai_recommendations, and returns the ranked results.
 *
 * Body: RunRecommendationRequest
 * Response: RunRecommendationResponse
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { runRecommendationEngine } from "@/lib/recommendation-engine";
import type { RunRecommendationRequest, RunRecommendationResponse } from "@/lib/recommendation-engine";
import type { ConsultationFormState } from "@/types/consultation";

export async function POST(request: Request) {
  try {
    const rateLimit = applyRateLimit(request, "recommendations", 20, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let body: RunRecommendationRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { consultation_id, session_id, state } = body;

    if (!consultation_id || typeof consultation_id !== "string") {
      return NextResponse.json({ error: "consultation_id is required." }, { status: 400 });
    }

    if (!state || typeof state !== "object") {
      return NextResponse.json({ error: "state is required." }, { status: 400 });
    }

    // ── Run engine ───────────────────────────────────────────────────────────

    const results = runRecommendationEngine(state as ConsultationFormState);

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No vehicles matched your criteria. Try adjusting your budget." },
        { status: 422 },
      );
    }

    // ── Build persistence payload ─────────────────────────────────────────────

    const primaryVehicleId = results[0]?.vehicle.id ?? null;
    const confidenceScore  = results[0]?.match_score ?? 0;

    // recommendation_payload stores the full ranked output as JSON
    // recommended_vehicle_ids is stored as an empty array here because we're
    // using static evModels (string slugs, not UUIDs). When the vehicles table
    // is populated, back-fill this column with proper UUIDs.
    const admin = createAdminClient();

    const { data: saved, error: saveError } = await admin
      .from("ai_recommendations")
      .insert({
        consultation_id,
        session_id: session_id ?? null,
        // Empty UUID array — slugs are stored in recommendation_payload
        recommended_vehicle_ids: [],
        primary_vehicle_id: null, // Populate when vehicles table has UUIDs
        recommendation_payload: {
          results: results.map((r) => ({
            rank:                   r.rank,
            vehicle_id:             r.vehicle.id,
            vehicle_label:          `${r.vehicle.brand} ${r.vehicle.model}`,
            match_score:            r.match_score,
            breakdown:              r.breakdown,
            reasons:                r.reasons,
            tradeoffs:              r.tradeoffs,
            estimated_monthly_cost: r.estimated_monthly_cost,
            charging_fit_summary:   r.charging_fit_summary,
            savings_summary:        r.savings_summary,
            explanation:            r.explanation ?? null,
          })),
          primary_vehicle_slug:     primaryVehicleId,
          generated_at:             new Date().toISOString(),
        },
        explanation:      results[0]?.explanation ?? null,
        confidence_score: confidenceScore,
      })
      .select("id")
      .single();

    if (saveError || !saved) {
      console.error("[recommendations] save failed:", saveError?.message);
      // Still return results even if save failed — don't block the user
      return NextResponse.json(
        {
          recommendation_id: null,
          results,
        } satisfies RunRecommendationResponse,
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        recommendation_id: saved.id,
        results,
      } satisfies RunRecommendationResponse,
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[recommendations] unexpected:", msg);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
