import { createAdminClient } from "@/lib/supabase/admin";
import { evModels } from "@/data/evModels";
import {
  resolveIdentityFilter,
  type IdentityFilter,
  type TrackingIdentity,
} from "@/lib/tracking/identity-shared";
import type { AffordabilityBand, LeadUserType, UserEventType } from "@/types";
import { inferBuyerStyle } from "@/lib/profiling/buyer-style";

// Supabase admin client type is opaque — use ReturnType to keep things DRY.
type AdminClient = ReturnType<typeof createAdminClient>;

/** Pure in-memory lookup — no DB call needed. */
function getBrandFromCarId(carId: string | null): string | null {
  if (!carId) return null;
  const ev = evModels.find((m) => m.id === carId);
  return ev?.brand ?? null;
}

// ─── Sub-readers (each reads one upstream table) ──────────────────────────────

type LeadScoreSnapshot = {
  score: number;
  userType: LeadUserType;
  predictedBuyWindow: string;
  strongestInterestCarId: string | null;
  lastActivityAt: string | null;
};

async function readLeadScore(
  admin: AdminClient,
  filter: IdentityFilter,
): Promise<LeadScoreSnapshot> {
  const { data } = await admin
    .from("lead_scores")
    .select("score, user_type, predicted_buy_window, interested_car_id, last_activity_at")
    .eq(filter.column, filter.value)
    .maybeSingle();

  return {
    score: (data?.score as number) ?? 0,
    userType: (data?.user_type as LeadUserType) ?? "casual",
    predictedBuyWindow: (data?.predicted_buy_window as string) ?? "30+ days",
    strongestInterestCarId: (data?.interested_car_id as string | null) ?? null,
    lastActivityAt: (data?.last_activity_at as string | null) ?? null,
  };
}

async function readAffordabilityBand(
  admin: AdminClient,
  filter: IdentityFilter,
): Promise<AffordabilityBand> {
  const { data } = await admin
    .from("user_financial_profiles")
    .select("estimated_affordability_band")
    .eq(filter.column, filter.value)
    .maybeSingle();

  return (data?.estimated_affordability_band as AffordabilityBand) ?? "entry";
}

type EventCounts = {
  visitCount: number;
  emiUsageCount: number;
  compareCount: number;
};

type BehavioralEventRecord = {
  event_type: UserEventType;
  car_id: string | null;
  event_value: Record<string, unknown> | null;
  page_path: string | null;
  created_at: string;
};

async function readEventCounts(
  admin: AdminClient,
  filter: IdentityFilter,
): Promise<EventCounts> {
  // Fan out three COUNT queries in parallel — no joins needed.
  const [total, emi, compare] = await Promise.all([
    admin
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq(filter.column, filter.value),
    admin
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq(filter.column, filter.value)
      .eq("event_type", "emi_used"),
    admin
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq(filter.column, filter.value)
      .eq("event_type", "compare_clicked"),
  ]);

  return {
    visitCount: total.count ?? 0,
    emiUsageCount: emi.count ?? 0,
    compareCount: compare.count ?? 0,
  };
}

/**
 * Reads a bounded recent event window for explainable behavior-style inference.
 * Keeping this capped avoids unbounded scans and keeps the classifier fast.
 */
async function readRecentBehavioralEvents(
  admin: AdminClient,
  filter: IdentityFilter,
): Promise<BehavioralEventRecord[]> {
  const { data, error } = await admin
    .from("user_events")
    .select("event_type, car_id, event_value, page_path, created_at")
    .eq(filter.column, filter.value)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[intent-profile] failed to read recent behavioral events:", error.message);
    return [];
  }

  return (data ?? []) as BehavioralEventRecord[];
}

/**
 * Reads the most recent body-type preference for a logged-in user.
 * Returns null for anonymous sessions (no user_preferences rows exist).
 * "any" is treated as no preference and also returns null.
 */
async function readBodyTypePreference(
  admin: AdminClient,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;

  const { data } = await admin
    .from("user_preferences")
    .select("preferred_body_type")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const bodyType = (data?.preferred_body_type as string | null) ?? null;
  // "any" means no specific preference — don't persist it.
  if (!bodyType || bodyType === "any") return null;
  return bodyType;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds and upserts a unified user_intent_profiles row by aggregating from:
 *   - lead_scores (intent score, classification, top car)
 *   - user_financial_profiles (affordability band)
 *   - user_events (activity counters)
 *   - user_preferences (body type preference for logged-in users)
 *   - local evModels array (brand lookup from car_id)
 *
 * Call this AFTER refreshLeadScoreForIdentity and refreshFinancialProfileForIdentity
 * to ensure all upstream tables are current before reading.
 */
export async function refreshIntentProfileForIdentity(
  identity: TrackingIdentity,
): Promise<void> {
  const filter = resolveIdentityFilter(identity);
  if (!filter) return;

  const admin = createAdminClient();

  // Fan out all upstream reads in parallel — they are independent of each other.
  const [leadScore, affordabilityBand, eventCounts, favoriteBodyType, recentBehavioralEvents] = await Promise.all([
    readLeadScore(admin, filter),
    readAffordabilityBand(admin, filter),
    readEventCounts(admin, filter),
    readBodyTypePreference(admin, identity.userId),
    readRecentBehavioralEvents(admin, filter),
  ]);

  const styleInference = inferBuyerStyle({
    events: recentBehavioralEvents,
    compareCount: eventCounts.compareCount,
    emiUsageCount: eventCounts.emiUsageCount,
    visitCount: eventCounts.visitCount,
  });

  // Derive brand from the car the user has shown the most interest in.
  const favoriteBrand = getBrandFromCarId(leadScore.strongestInterestCarId);

  const row = {
    user_id: identity.userId,
    session_id: identity.sessionId,
    intent_score: leadScore.score,
    user_type: leadScore.userType,
    predicted_buy_window: leadScore.predictedBuyWindow,
    estimated_affordability_band: affordabilityBand,
    strongest_interest_car_id: leadScore.strongestInterestCarId,
    favorite_brand: favoriteBrand,
    favorite_body_type: favoriteBodyType,
    visit_count: eventCounts.visitCount,
    emi_usage_count: eventCounts.emiUsageCount,
    compare_count: eventCounts.compareCount,
    inferred_buyer_style: styleInference.inferredStyle,
    inferred_buyer_style_confidence: styleInference.confidence,
    inferred_buyer_style_reason: styleInference.reason,
    last_activity_at: leadScore.lastActivityAt,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("user_intent_profiles")
    .select("id")
    .eq(filter.column, filter.value)
    .maybeSingle();

  const write = existing
    ? admin.from("user_intent_profiles").update(row).eq("id", existing.id)
    : admin.from("user_intent_profiles").insert(row);

  const { error } = await write;

  if (error) {
    console.error("[intent-profile] failed to persist user_intent_profiles:", error.message);
  }
}
