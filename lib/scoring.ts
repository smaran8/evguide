/**
 * lib/scoring.ts
 *
 * Platform lead scoring engine.
 * Reads from the new user_events table (platform schema, migration 011).
 * Produces a 0–100 score, a category, and a human-readable reasons array.
 *
 * Scoring bands:
 *   0–24   = cold
 *   25–49  = warm
 *   50–74  = hot
 *   75–100 = finance_ready
 *
 * Pure scoring logic is in computeLeadScore() — no DB calls, fully testable.
 * DB-coupled function is refreshPlatformLeadScore() — upserts to lead_scores.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadScoreCategory, ScoringReason } from "@/types/platform";

// ── Event point values ────────────────────────────────────────────────────────

const EVENT_POINTS: Record<string, number> = {
  // Low intent
  page_view:                   1,
  viewed_vehicle_detail:       3,
  searched_vehicle:            4,
  filtered_vehicle_list:       4,
  viewed_charging_content:     3,

  // Medium intent
  opened_compare_tool:         6,
  added_vehicle_to_compare:    8,
  completed_vehicle_compare:  12,
  opened_emi_calculator:      10,
  calculated_emi:             12,
  viewed_finance_offer:       10,

  // High intent
  started_consultation:       15,
  answered_consultation_question: 2,
  completed_consultation:     25,
  viewed_ai_recommendation:   12,
  clicked_recommended_vehicle:  8,
  started_finance_form:       20,
  submitted_finance_request:  35,
  submitted_contact_form:     25,
  booked_callback:            30,
  booked_test_drive:          40,
};

// ── Input types ───────────────────────────────────────────────────────────────

export interface ScoringEvent {
  event_name:  string;
  page_path:   string | null;
  vehicle_id:  string | null;
  metadata:    Record<string, unknown>;
  created_at:  string;
  session_id:  string | null;
}

export interface ComputedLeadScore {
  score:           number;
  category:        LeadScoreCategory;
  scoring_reasons: ScoringReason[];
}

// ── Pure scoring function ─────────────────────────────────────────────────────

export function computeLeadScore(events: ScoringEvent[]): ComputedLeadScore {
  const reasons: ScoringReason[] = [];
  let total = 0;

  if (events.length === 0) {
    return { score: 0, category: "cold", scoring_reasons: [] };
  }

  // ── Base event points ────────────────────────────────────────────────────

  // Accumulate per event type, but count `answered_consultation_question` per occurrence
  const eventCounts: Record<string, number> = {};
  for (const e of events) {
    eventCounts[e.event_name] = (eventCounts[e.event_name] ?? 0) + 1;
  }

  for (const [eventName, count] of Object.entries(eventCounts)) {
    const pts = EVENT_POINTS[eventName];
    if (!pts) continue;

    if (eventName === "answered_consultation_question") {
      // Each answer counts separately (up to 10 to avoid over-inflation)
      const capped = Math.min(count, 10);
      const earned = pts * capped;
      total += earned;
      reasons.push({ rule: eventName, points: earned, label: `${capped} consultation answer(s)` });
    } else {
      // For all other events: award points once per event type (not per occurrence)
      // except for events that naturally repeat (e.g. calculated_emi)
      const repeatable = new Set([
        "calculated_emi",
        "viewed_finance_offer",
        "viewed_vehicle_detail",
        "clicked_recommended_vehicle",
      ]);
      const earnedCount = repeatable.has(eventName) ? Math.min(count, 3) : 1;
      const earned = pts * earnedCount;
      total += earned;
      reasons.push({ rule: eventName, points: earned, label: buildEventLabel(eventName, earnedCount) });
    }
  }

  // ── Multipliers ──────────────────────────────────────────────────────────

  const now   = new Date();
  const ago7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const ago14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Sessions in last 7 days
  const sessionsLast7 = new Set(
    events
      .filter((e) => e.session_id && new Date(e.created_at) >= ago7)
      .map((e) => e.session_id),
  ).size;

  if (sessionsLast7 >= 2) {
    total += 10;
    reasons.push({ rule: "return_visit_7d", points: 10, label: `${sessionsLast7} sessions in last 7 days` });
  }

  // 3+ EMI calculations in last 7 days
  const emiIn7 = events.filter(
    (e) => e.event_name === "calculated_emi" && new Date(e.created_at) >= ago7,
  ).length;
  if (emiIn7 >= 3) {
    total += 10;
    reasons.push({ rule: "emi_heavy_use_7d", points: 10, label: `${emiIn7} EMI calculations in 7 days` });
  }

  // 2+ finance offer views
  const financeViews = eventCounts["viewed_finance_offer"] ?? 0;
  if (financeViews >= 2) {
    total += 8;
    reasons.push({ rule: "repeat_finance_views", points: 8, label: `${financeViews} finance offer views` });
  }

  // Same vehicle viewed 3+ times
  const vehicleCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.vehicle_id && e.event_name === "viewed_vehicle_detail") {
      vehicleCounts[e.vehicle_id] = (vehicleCounts[e.vehicle_id] ?? 0) + 1;
    }
  }
  const maxVehicleViews = Math.max(0, ...Object.values(vehicleCounts));
  if (maxVehicleViews >= 3) {
    total += 8;
    reasons.push({ rule: "repeat_vehicle_views", points: 8, label: `Same vehicle viewed ${maxVehicleViews}× ` });
  }

  // Consultation + finance request in same session
  const sessionConsultation = new Set(
    events.filter((e) => e.event_name === "completed_consultation").map((e) => e.session_id),
  );
  const sessionFinance = new Set(
    events.filter((e) => e.event_name === "submitted_finance_request").map((e) => e.session_id),
  );
  const crossSession = [...sessionConsultation].some((s) => s && sessionFinance.has(s));
  if (crossSession) {
    total += 20;
    reasons.push({ rule: "consultation_plus_finance_session", points: 20, label: "Consultation + finance request in same session" });
  }

  // Compare + EMI + finance page in same session
  const hasCompare  = new Set(events.filter((e) => e.event_name === "opened_compare_tool").map((e) => e.session_id));
  const hasEmi      = new Set(events.filter((e) => e.event_name === "opened_emi_calculator").map((e) => e.session_id));
  const hasFinPage  = new Set(events.filter((e) => e.page_path?.includes("/finance")).map((e) => e.session_id));
  const tripleSession = [...hasCompare].some((s) => s && hasEmi.has(s) && hasFinPage.has(s));
  if (tripleSession) {
    total += 15;
    reasons.push({ rule: "compare_emi_finance_session", points: 15, label: "Compare + EMI + finance in one session" });
  }

  // ── Negative / cooling signals ────────────────────────────────────────────

  // Bounced in under 20 seconds (only 1 page_view, session lasted <20s)
  const allSessions = [...new Set(events.map((e) => e.session_id))];
  let bouncedSessions = 0;
  for (const sid of allSessions) {
    const sessionEvents = events.filter((e) => e.session_id === sid);
    if (sessionEvents.length <= 1) {
      bouncedSessions++;
    } else {
      const times = sessionEvents.map((e) => new Date(e.created_at).getTime()).sort();
      const durationMs = (times[times.length - 1] ?? 0) - (times[0] ?? 0);
      if (durationMs < 20_000) bouncedSessions++;
    }
  }
  if (bouncedSessions > 0) {
    const deduct = Math.min(5 * bouncedSessions, 15);
    total -= deduct;
    reasons.push({ rule: "bounce", points: -deduct, label: `${bouncedSessions} quick bounce(s)` });
  }

  // No return visit after 14 days
  const mostRecent = events.reduce(
    (latest, e) => (new Date(e.created_at) > latest ? new Date(e.created_at) : latest),
    new Date(0),
  );
  if (mostRecent < ago14) {
    total -= 8;
    reasons.push({ rule: "stale_14d", points: -8, label: "No activity in 14+ days" });
  }

  // Blog/news-only: no product activity → cap at 15
  const productEvents = new Set([
    "viewed_vehicle_detail", "searched_vehicle", "filtered_vehicle_list",
    "opened_emi_calculator", "calculated_emi", "viewed_finance_offer",
    "started_consultation", "completed_consultation",
    "opened_compare_tool", "added_vehicle_to_compare",
    "submitted_finance_request", "submitted_contact_form",
    "booked_callback", "booked_test_drive",
  ]);
  const hasProductActivity = events.some((e) => productEvents.has(e.event_name));
  if (!hasProductActivity && total > 15) {
    total = 15;
    reasons.push({ rule: "blog_only_cap", points: 0, label: "Score capped at 15 — no product activity" });
  }

  // ── Clamp & categorise ───────────────────────────────────────────────────

  const score = Math.min(100, Math.max(0, Math.round(total)));
  const category = scoreToCategory(score);

  return { score, category, scoring_reasons: reasons };
}

// ── Category helper ───────────────────────────────────────────────────────────

export function scoreToCategory(score: number): LeadScoreCategory {
  if (score >= 75) return "finance_ready";
  if (score >= 50) return "hot";
  if (score >= 25) return "warm";
  return "cold";
}

export const CATEGORY_LABELS: Record<LeadScoreCategory, string> = {
  cold:           "Cold",
  warm:           "Warm",
  hot:            "Hot",
  finance_ready:  "Finance Ready",
};

// ── DB-coupled refresh ────────────────────────────────────────────────────────

/**
 * Recalculates and upserts a lead score row for a given session_id.
 * Safe to call after major platform events.
 */
export async function refreshPlatformLeadScore(
  sessionId: string,
  opts: { consultationId?: string | null; profileId?: string | null } = {},
): Promise<ComputedLeadScore | null> {
  const admin = createAdminClient();

  const { data: events, error } = await admin
    .from("user_events")
    .select("event_name, page_path, vehicle_id, metadata, created_at, session_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[scoring] failed to load events:", error.message);
    return null;
  }

  const typedEvents = (events ?? []) as ScoringEvent[];
  const computed = computeLeadScore(typedEvents);

  const row = {
    session_id:          sessionId,
    profile_id:          opts.profileId ?? null,
    consultation_id:     opts.consultationId ?? null,
    score:               computed.score,
    category:            computed.category,
    scoring_reasons:     computed.scoring_reasons,
    last_calculated_at:  new Date().toISOString(),
    updated_at:          new Date().toISOString(),
  };

  // Upsert on session_id
  const { error: upsertError } = await admin
    .from("lead_scores")
    .upsert(row, { onConflict: "session_id" });

  if (upsertError) {
    console.error("[scoring] upsert failed:", upsertError.message);
    return null;
  }

  return computed;
}

// ── Label helper ──────────────────────────────────────────────────────────────

function buildEventLabel(eventName: string, count: number): string {
  const labels: Record<string, string> = {
    page_view:                   "Page views",
    viewed_vehicle_detail:       "Vehicle detail views",
    searched_vehicle:            "Vehicle search",
    filtered_vehicle_list:       "Filter usage",
    viewed_charging_content:     "Viewed charging content",
    opened_compare_tool:         "Opened compare tool",
    added_vehicle_to_compare:    "Added to comparison",
    completed_vehicle_compare:   "Completed comparison",
    opened_emi_calculator:       "Opened EMI calculator",
    calculated_emi:              "EMI calculated",
    viewed_finance_offer:        "Viewed finance offer",
    started_consultation:        "Started consultation",
    completed_consultation:      "Completed consultation",
    viewed_ai_recommendation:    "Viewed AI recommendations",
    clicked_recommended_vehicle: "Clicked recommended vehicle",
    started_finance_form:        "Started finance form",
    submitted_finance_request:   "Submitted finance request",
    submitted_contact_form:      "Submitted contact form",
    booked_callback:             "Booked callback",
    booked_test_drive:           "Booked test drive",
  };
  const base = labels[eventName] ?? eventName.replace(/_/g, " ");
  return count > 1 ? `${base} (×${count})` : base;
}
