import { createAdminClient } from "@/lib/supabase/admin";
import { getTopInterestedCarId } from "@/lib/tracking/car-interest";
import {
  resolveIdentityFilter,
  type TrackingIdentity,
} from "@/lib/tracking/identity-shared";
import type { LeadUserType, UserEventType } from "@/types";

type UserEventRecord = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  car_id: string | null;
  event_type: UserEventType;
  created_at: string;
};

type LeadClassification = {
  score: number;
  userType: LeadUserType;
  predictedBuyWindow: string;
};

const EVENT_WEIGHTS: Record<UserEventType, number> = {
  page_view: 1,
  car_view: 5,
  vehicle_view: 5,
  engagement_milestone: 2,
  recommendation_started: 10,
  recommendation_completed: 22,
  emi_used: 10,
  compare_clicked: 8,
  price_filter_used: 0,
  filter_used: 0,
  loan_offer_clicked: 15,
  repeat_visit: 10,
  consultation_started: 18,
  consultation_submitted: 32,
  test_drive_clicked: 30,
  finance_apply_clicked: 35,
  reserve_clicked: 40,
  sort_changed: 0,
  save_clicked: 0,
  tier_section_viewed: 0,
  search_used: 0,
};

function classifyScore(score: number): LeadClassification {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  if (safeScore <= 30) {
    return {
      score: safeScore,
      userType: "casual",
      predictedBuyWindow: "30+ days",
    };
  }

  if (safeScore <= 70) {
    return {
      score: safeScore,
      userType: "research",
      predictedBuyWindow: "7 to 14 days",
    };
  }

  return {
    score: safeScore,
    userType: "buyer",
    predictedBuyWindow: "1 to 7 days",
  };
}

function getInterestedCarId(events: UserEventRecord[]): string | null {
  for (const event of events) {
    if (event.car_id) return event.car_id;
  }

  return null;
}

/**
 * Recomputes and upserts lead_scores for one identity by reading user_events.
 * This is intentionally simple so weights/rules can be tuned later.
 */
export async function refreshLeadScoreForIdentity(identity: TrackingIdentity): Promise<void> {
  const filter = resolveIdentityFilter(identity);
  if (!filter) return;

  const admin = createAdminClient();
  const { data: events, error: eventsError } = await admin
    .from("user_events")
    .select("id, user_id, session_id, car_id, event_type, created_at")
    .eq(filter.column, filter.value)
    .order("created_at", { ascending: false });

  if (eventsError) {
    console.error("[lead-intent] failed to read user_events:", eventsError.message);
    return;
  }

  const allEvents = (events ?? []) as UserEventRecord[];
  if (allEvents.length === 0) return;

  const rawScore = allEvents.reduce((sum, event) => {
    const weight = EVENT_WEIGHTS[event.event_type] ?? 0;
    return sum + weight;
  }, 0);

  const classification = classifyScore(rawScore);
  const strongestInterestCar = await getTopInterestedCarId(identity);
  const interestedCarId = strongestInterestCar ?? getInterestedCarId(allEvents);
  const lastActivityAt = allEvents[0].created_at;

  const row = {
    user_id: identity.userId,
    session_id: identity.sessionId,
    score: classification.score,
    user_type: classification.userType,
    predicted_buy_window: classification.predictedBuyWindow,
    interested_car_id: interestedCarId,
    last_activity_at: lastActivityAt,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("lead_scores")
    .select("id")
    .eq(filter.column, filter.value)
    .maybeSingle();

  const write = existing
    ? admin.from("lead_scores").update(row).eq("id", existing.id)
    : admin.from("lead_scores").insert(row);

  const { error: writeError } = await write;

  if (writeError) {
    console.error("[lead-intent] failed to persist lead_scores:", writeError.message);
  }
}

export const leadIntentWeights = EVENT_WEIGHTS;
export const classifyLeadScore = classifyScore;
