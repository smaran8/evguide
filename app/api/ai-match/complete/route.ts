/**
 * POST /api/ai-match/complete
 *
 * Called when a logged-in user finishes the AI chat advisor.
 * Records the session in:
 *   1. consultations       — captures the user's answers
 *   2. ai_recommendations  — stores ranked match results
 *   3. lead_scores         — ensures the user appears in the pipeline board
 *   4. lead_pipeline       — creates a CRM pipeline entry (stage = "new")
 *
 * Anonymous users are silently skipped (returns 200 with skipped=true).
 */

import { NextResponse }         from "next/server";
import { createClient }         from "@/lib/supabase/server";
import { createAdminClient }    from "@/lib/supabase/admin";
import { applyRateLimit }       from "@/lib/security/rate-limit";
import { suggestPipelineStage, suggestPriority } from "@/lib/lead-pipeline";
import type { MatchAnswers }    from "@/components/recommendation/recommendationEngine";

// ── Answer → consultation column mapping ──────────────────────────────────────

function budgetToMax(budget: string | undefined): number | null {
  switch (budget) {
    case "under_30": return 30000;
    case "under_40": return 40000;
    case "under_55": return 55000;
    default:         return null;
  }
}

function mileageToDailyMiles(mileage: string | undefined): number | null {
  switch (mileage) {
    case "city":       return 20;
    case "balanced":   return 40;
    case "long_range": return 80;
    default:           return null;
  }
}

// ── Score estimate for a chat completion ─────────────────────────────────────
// recommendation_started (10) + recommendation_completed (22) = 32 baseline
const CHAT_COMPLETE_SCORE = 32;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "ai-match-complete", 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Auth check — silently skip anonymous users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ skipped: true, reason: "unauthenticated" });
  }

  let body: {
    answers: Partial<MatchAnswers>;
    results: Array<{ modelId: string; brand: string; model: string; matchScore: number }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { answers, results } = body;
  if (!results?.length) {
    return NextResponse.json({ error: "results required." }, { status: 400 });
  }

  const admin      = createAdminClient();
  const profileId  = user.id;   // profiles.id mirrors auth.users.id
  const topResult  = results[0]!;

  // ── 1. Insert consultation ────────────────────────────────────────────────
  const { data: consultation, error: consultErr } = await admin
    .from("consultations")
    .insert({
      profile_id:           profileId,
      budget_max_gbp:       budgetToMax(answers.budget),
      daily_miles:          mileageToDailyMiles(answers.mileage),
      body_type_preference: answers.bodyType !== "any" ? answers.bodyType : null,
      home_charging:        answers.charging === "home" ? true
                          : answers.charging === "public" || answers.charging === "work" ? false
                          : null,
      public_charging_ok:   answers.charging === "public" ? true : null,
      range_priority:       answers.priority === "range"       ? "high" : null,
      performance_priority: answers.priority === "performance" ? "high" : null,
      main_reason_for_ev:   answers.priority ?? null,
      notes:                `AI chat advisor — condition: ${answers.condition ?? "any"}, postcode: ${answers.postcode ?? "not provided"}`,
    })
    .select("id")
    .single();

  if (consultErr || !consultation) {
    console.error("[ai-match/complete] consultations insert failed:", consultErr?.message);
    return NextResponse.json({ error: "Failed to save consultation." }, { status: 500 });
  }

  const consultationId = consultation.id as string;

  // ── 2. Insert ai_recommendation ───────────────────────────────────────────
  const { data: rec, error: recErr } = await admin
    .from("ai_recommendations")
    .insert({
      consultation_id:        consultationId,
      profile_id:             profileId,
      recommended_vehicle_ids: [],   // slug-based system; no UUID vehicle table yet
      primary_vehicle_id:     null,
      confidence_score:       topResult.matchScore,
      explanation:            `Top match: ${topResult.brand} ${topResult.model} (${topResult.matchScore}%)`,
      recommendation_payload: {
        source: "ai_chat_advisor",
        generated_at: new Date().toISOString(),
        results: results.map((r, i) => ({
          rank:          i + 1,
          vehicle_id:    r.modelId,
          vehicle_label: `${r.brand} ${r.model}`,
          match_score:   r.matchScore,
        })),
        primary_vehicle_slug: topResult.modelId,
      },
    })
    .select("id")
    .single();

  if (recErr) {
    // Non-fatal — pipeline will still work without the recommendation row
    console.error("[ai-match/complete] ai_recommendations insert failed:", recErr?.message);
  }

  // ── 3. Upsert lead_scores ─────────────────────────────────────────────────
  // Ensures the profile appears in getPipelineLeads() which iterates lead_scores.
  const { data: existingScore } = await admin
    .from("lead_scores")
    .select("id, score")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existingScore) {
    // Update consultation link and bump score if current is lower
    const newScore = Math.max(existingScore.score as number, CHAT_COMPLETE_SCORE);
    await admin
      .from("lead_scores")
      .update({
        consultation_id:    consultationId,
        score:              newScore,
        category:           newScore >= 75 ? "hot" : newScore >= 50 ? "warm" : "cold",
        last_calculated_at: new Date().toISOString(),
      })
      .eq("id", existingScore.id);
  } else {
    // Create a new lead_scores entry
    await admin.from("lead_scores").insert({
      profile_id:         profileId,
      consultation_id:    consultationId,
      session_id:         profileId,   // fallback — no formal session UUID from the chat
      score:              CHAT_COMPLETE_SCORE,
      category:           "cold",
      scoring_reasons:    [{ reason: "ai_chat_completed", weight: CHAT_COMPLETE_SCORE }],
      last_calculated_at: new Date().toISOString(),
    });
  }

  // ── 4. Insert lead_pipeline entry ─────────────────────────────────────────
  // Check for an existing pipeline row for this profile to avoid duplicates.
  const { data: existingPipeline } = await admin
    .from("lead_pipeline")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!existingPipeline) {
    const stage    = suggestPipelineStage(CHAT_COMPLETE_SCORE);
    const priority = suggestPriority(CHAT_COMPLETE_SCORE);

    await admin.from("lead_pipeline").insert({
      profile_id:      profileId,
      consultation_id: consultationId,
      stage,
      priority,
      notes: `AI Chat Advisor — Top match: ${topResult.brand} ${topResult.model} (${topResult.matchScore}% match). Budget: ${answers.budget ?? "not specified"}.`,
    });
  } else {
    // Update existing entry with latest consultation
    await admin
      .from("lead_pipeline")
      .update({ consultation_id: consultationId, updated_at: new Date().toISOString() })
      .eq("id", existingPipeline.id);
  }

  return NextResponse.json({
    success:         true,
    consultation_id: consultationId,
    recommendation_id: rec?.id ?? null,
  }, { status: 201 });
}
