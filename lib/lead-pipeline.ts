/**
 * lib/lead-pipeline.ts
 *
 * Pipeline stage helpers and admin data-fetch functions.
 * Reads from lead_scores, lead_pipeline, consultations,
 * ai_recommendations, and finance_requests.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { scoreToCategory, CATEGORY_LABELS } from "@/lib/scoring";
export { CATEGORY_LABELS } from "@/lib/scoring";
import type {
  LeadPipelineStage,
  LeadPipelinePriority,
  LeadScoreCategory,
  ScoringReason,
  FinanceRequestStatus,
} from "@/types/platform";

// ── Stage config ──────────────────────────────────────────────────────────────

export const PIPELINE_STAGES: LeadPipelineStage[] = [
  "new", "contacted", "qualified", "proposal", "converted", "lost",
];

export const STAGE_LABELS: Record<LeadPipelineStage, string> = {
  new:       "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal:  "Proposal Sent",
  converted: "Converted",
  lost:      "Lost",
};

export const STAGE_COLORS: Record<LeadPipelineStage, string> = {
  new:       "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-amber-100 text-amber-700",
  proposal:  "bg-purple-100 text-purple-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost:      "bg-red-100 text-red-600",
};

export const PRIORITY_COLORS: Record<LeadPipelinePriority, string> = {
  low:    "bg-slate-100 text-slate-500",
  normal: "bg-slate-100 text-slate-700",
  high:   "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-600",
};

export const CATEGORY_COLORS: Record<LeadScoreCategory, string> = {
  cold:          "bg-slate-100 text-slate-600",
  warm:          "bg-amber-100 text-amber-700",
  hot:           "bg-orange-100 text-orange-700",
  finance_ready: "bg-emerald-100 text-emerald-700",
};

export const FINANCE_STATUS_COLORS: Record<FinanceRequestStatus, string> = {
  new:       "bg-blue-100 text-blue-700",
  reviewing: "bg-amber-100 text-amber-700",
  approved:  "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100 text-red-600",
  converted: "bg-purple-100 text-purple-700",
};

// ── Auto-suggest pipeline stage from score ────────────────────────────────────

export function suggestPipelineStage(score: number): LeadPipelineStage {
  if (score >= 75) return "qualified";
  if (score >= 50) return "contacted";
  if (score >= 25) return "new";
  return "new";
}

export function suggestPriority(score: number): LeadPipelinePriority {
  if (score >= 75) return "urgent";
  if (score >= 60) return "high";
  if (score >= 40) return "normal";
  return "low";
}

// ── Admin data types ──────────────────────────────────────────────────────────

export interface PipelineLeadRow {
  // Identity
  id:           string;  // lead_scores.id
  session_id:   string;
  profile_id:   string | null;
  display_id:   string;
  email:        string | null;
  full_name:    string | null;

  // Score
  score:             number;
  category:          LeadScoreCategory;
  category_label:    string;
  scoring_reasons:   ScoringReason[];
  last_calculated_at: string;

  // Consultation
  consultation_id:         string | null;
  consultation_created_at: string | null;
  consultation_reason:     string | null;
  consultation_budget_max: number | null;
  consultation_daily_miles: number | null;
  consultation_home_charging: boolean | null;

  // Recommendation
  top_recommended_vehicle:  string | null;
  recommendation_score:     number | null;
  recommendation_id:        string | null;

  // Finance
  finance_request_id:    string | null;
  finance_status:        FinanceRequestStatus | null;
  finance_deposit:       number | null;
  finance_income_band:   string | null;

  // Pipeline
  pipeline_id:    string | null;
  pipeline_stage: LeadPipelineStage;
  priority:       LeadPipelinePriority;
  assigned_to:    string | null;
  pipeline_notes: string | null;

  created_at: string;
}

// ── Fetch all pipeline leads (admin) ──────────────────────────────────────────

export async function getPipelineLeads(): Promise<PipelineLeadRow[]> {
  const admin = createAdminClient();

  // 1. Lead scores (primary)
  const { data: scores, error: scoresErr } = await admin
    .from("lead_scores")
    .select(
      "id, session_id, profile_id, consultation_id, score, category, scoring_reasons, last_calculated_at, created_at",
    )
    .order("score", { ascending: false })
    .limit(500);

  if (scoresErr || !scores) {
    console.error("[pipeline] lead_scores fetch failed:", scoresErr?.message);
    return [];
  }

  // 2. Batch-fetch related data for found session/consultation/profile IDs
  const sessionIds     = [...new Set(scores.map((s) => s.session_id).filter(Boolean))];
  const consultationIds = [...new Set(scores.map((s) => s.consultation_id).filter(Boolean))];
  const profileIds     = [...new Set(scores.map((s) => s.profile_id).filter(Boolean))];

  const [
    { data: consultations },
    { data: recommendations },
    { data: financeRequests },
    { data: pipelines },
    { data: profiles },
  ] = await Promise.all([
    consultationIds.length
      ? admin
          .from("consultations")
          .select("id, session_id, main_reason_for_ev, budget_max_gbp, daily_miles, home_charging, created_at")
          .in("id", consultationIds)
      : Promise.resolve({ data: [] }),

    consultationIds.length
      ? admin
          .from("ai_recommendations")
          .select("id, consultation_id, confidence_score, recommendation_payload")
          .in("consultation_id", consultationIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    sessionIds.length
      ? admin
          .from("finance_requests")
          .select("id, session_id, consultation_id, deposit_gbp, estimated_income_band, target_monthly_budget_gbp, status, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    admin
      .from("lead_pipeline")
      .select("id, consultation_id, finance_request_id, profile_id, stage, priority, assigned_to, notes, updated_at")
      .order("updated_at", { ascending: false }),

    profileIds.length
      ? admin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Index by key for O(1) lookups
  const consultationMap = new Map(
    (consultations ?? []).map((c: Record<string, unknown>) => [c.id as string, c]),
  );

  // Latest recommendation per consultation
  const recMap = new Map<string, Record<string, unknown>>();
  for (const r of (recommendations ?? []) as Record<string, unknown>[]) {
    const cid = r.consultation_id as string;
    if (!recMap.has(cid)) recMap.set(cid, r);
  }

  // Latest finance request per session
  const financeBySession = new Map<string, Record<string, unknown>>();
  for (const f of (financeRequests ?? []) as Record<string, unknown>[]) {
    const sid = f.session_id as string;
    if (!financeBySession.has(sid)) financeBySession.set(sid, f);
  }
  const financeByCons = new Map<string, Record<string, unknown>>();
  for (const f of (financeRequests ?? []) as Record<string, unknown>[]) {
    const cid = f.consultation_id as string | null;
    if (cid && !financeByCons.has(cid)) financeByCons.set(cid, f);
  }

  // Pipeline per consultation or finance_request
  const pipelineByCons    = new Map<string, Record<string, unknown>>();
  const pipelineByProfile = new Map<string, Record<string, unknown>>();
  for (const p of (pipelines ?? []) as Record<string, unknown>[]) {
    const cid = p.consultation_id as string | null;
    const pid = p.profile_id as string | null;
    if (cid) pipelineByCons.set(cid, p);
    if (pid) pipelineByProfile.set(pid, p);
  }

  const profileMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p]),
  );

  return (scores as Record<string, unknown>[]).map((s): PipelineLeadRow => {
    const sessionId     = s.session_id as string;
    const profileId     = s.profile_id as string | null;
    const consultId     = s.consultation_id as string | null;
    const score         = s.score as number;
    const category      = (s.category as LeadScoreCategory) ?? scoreToCategory(score);

    const consultation  = consultId ? consultationMap.get(consultId) : null;
    const rec           = consultId ? recMap.get(consultId) : null;
    const finance       = financeBySession.get(sessionId) ?? (consultId ? financeByCons.get(consultId) : null);
    const pipeline      = (consultId ? pipelineByCons.get(consultId) : null) ??
                          (profileId ? pipelineByProfile.get(profileId) : null);
    const profile       = profileId ? profileMap.get(profileId) : null;

    // Extract top vehicle label from recommendation payload
    let topVehicle: string | null = null;
    let recScore: number | null   = null;
    if (rec) {
      const payload = rec.recommendation_payload as Record<string, unknown> | null;
      const results = payload?.results as Array<Record<string, unknown>> | null;
      if (results?.length) {
        const top = results[0];
        topVehicle = (top.vehicle_label as string) ?? null;
        recScore   = (top.match_score as number) ?? null;
      }
    }

    return {
      id:            s.id as string,
      session_id:    sessionId,
      profile_id:    profileId,
      display_id:    profileId
        ? `user:${profileId.slice(0, 8)}`
        : sessionId.slice(0, 14),
      email:         profile ? (profile.email as string | null) : null,
      full_name:     profile ? (profile.full_name as string | null) : null,

      score,
      category,
      category_label: CATEGORY_LABELS[category],
      scoring_reasons: (s.scoring_reasons as ScoringReason[]) ?? [],
      last_calculated_at: s.last_calculated_at as string,

      consultation_id:          consultId,
      consultation_created_at:  consultation ? (consultation.created_at as string) : null,
      consultation_reason:      consultation ? (consultation.main_reason_for_ev as string | null) : null,
      consultation_budget_max:  consultation ? (consultation.budget_max_gbp as number | null) : null,
      consultation_daily_miles: consultation ? (consultation.daily_miles as number | null) : null,
      consultation_home_charging: consultation ? (consultation.home_charging as boolean | null) : null,

      top_recommended_vehicle: topVehicle,
      recommendation_score:    recScore,
      recommendation_id:       rec ? (rec.id as string) : null,

      finance_request_id:  finance ? (finance.id as string) : null,
      finance_status:      finance ? (finance.status as FinanceRequestStatus) : null,
      finance_deposit:     finance ? (finance.deposit_gbp as number | null) : null,
      finance_income_band: finance ? (finance.estimated_income_band as string | null) : null,

      pipeline_id:    pipeline ? (pipeline.id as string) : null,
      pipeline_stage: pipeline
        ? (pipeline.stage as LeadPipelineStage)
        : suggestPipelineStage(score),
      priority:       pipeline
        ? (pipeline.priority as LeadPipelinePriority)
        : suggestPriority(score),
      assigned_to:    pipeline ? (pipeline.assigned_to as string | null) : null,
      pipeline_notes: pipeline ? (pipeline.notes as string | null) : null,

      created_at: s.created_at as string,
    };
  });
}

// ── Update pipeline stage ─────────────────────────────────────────────────────

export async function upsertPipelineEntry(params: {
  consultationId?: string | null;
  profileId?: string | null;
  financeRequestId?: string | null;
  stage: LeadPipelineStage;
  priority?: LeadPipelinePriority;
  assignedTo?: string | null;
  notes?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("lead_pipeline").upsert(
    {
      consultation_id:    params.consultationId ?? null,
      profile_id:         params.profileId ?? null,
      finance_request_id: params.financeRequestId ?? null,
      stage:              params.stage,
      priority:           params.priority ?? "normal",
      assigned_to:        params.assignedTo ?? null,
      notes:              params.notes ?? null,
      updated_at:         new Date().toISOString(),
    },
    { onConflict: "consultation_id" },
  );
  if (error) console.error("[pipeline] upsert failed:", error.message);
}
