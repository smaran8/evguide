import { evModels } from "@/data/evModels";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AffordabilityBand,
  CrmJourneyStage,
  CrmLeadListRow,
  CrmLeadNoteRow,
  CrmLeadRecordRow,
  LeadUserType,
  TestDriveBookingRow,
  UserEventType,
  UserIntentProfileRow,
} from "@/types";

type EventRow = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  car_id: string | null;
  event_type: UserEventType;
  event_value: Record<string, unknown> | null;
  page_path: string | null;
  created_at: string;
};

type ProfileWithCrm = {
  profile: UserIntentProfileRow;
  crm: CrmLeadRecordRow | null;
  events: EventRow[];
};

function getIdentityKey(userId: string | null, sessionId: string | null): string {
  return userId ? `user:${userId}` : `session:${sessionId ?? "unknown"}`;
}

function getDisplayId(profile: UserIntentProfileRow): string {
  if (profile.user_id) return `user:${profile.user_id.slice(0, 8)}`;
  if (profile.session_id) return profile.session_id.slice(0, 16);
  return profile.id.slice(0, 8);
}

function getStrongestCarLabel(carId: string | null): string | null {
  if (!carId) return null;
  const car = evModels.find((item) => item.id === carId);
  return car ? `${car.brand} ${car.model}` : null;
}

function getTopPaths(events: EventRow[]): string[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    const path = event.page_path?.trim();
    if (!path) continue;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([path]) => path);
}

function countEvent(events: EventRow[], eventType: UserEventType): number {
  return events.reduce((count, event) => count + (event.event_type === eventType ? 1 : 0), 0);
}

function inferJourneyStage(events: EventRow[]): { stage: CrmJourneyStage; reason: string } {
  const hasConversion =
    countEvent(events, "consultation_submitted") > 0 ||
    countEvent(events, "finance_apply_clicked") > 0 ||
    countEvent(events, "test_drive_clicked") > 0 ||
    countEvent(events, "reserve_clicked") > 0;

  if (hasConversion) {
    return {
      stage: "conversion",
      reason: "User has already completed a strong conversion action.",
    };
  }

  const hasFinanceSignals =
    countEvent(events, "emi_used") > 0 ||
    countEvent(events, "loan_offer_clicked") > 0 ||
    countEvent(events, "price_filter_used") > 0;

  if (hasFinanceSignals) {
    return {
      stage: "finance",
      reason: "Journey reached pricing or finance evaluation behaviour.",
    };
  }

  if (countEvent(events, "compare_clicked") > 0) {
    return {
      stage: "comparison",
      reason: "User is actively comparing multiple vehicles.",
    };
  }

  const hasResearchSignals =
    countEvent(events, "car_view") > 0 ||
    countEvent(events, "repeat_visit") > 0 ||
    countEvent(events, "recommendation_started") > 0 ||
    countEvent(events, "recommendation_completed") > 0;

  if (hasResearchSignals) {
    return {
      stage: "research",
      reason: "User is researching vehicles and returning to the journey.",
    };
  }

  return {
    stage: "awareness",
    reason: "User activity is still mostly top-of-funnel browsing.",
  };
}

function toLeadRow({ profile, crm, events }: ProfileWithCrm): CrmLeadListRow {
  const journey = inferJourneyStage(events);
  const conversionCount =
    countEvent(events, "consultation_submitted") +
    countEvent(events, "finance_apply_clicked") +
    countEvent(events, "test_drive_clicked") +
    countEvent(events, "reserve_clicked");

  return {
    id: profile.id,
    displayId: getDisplayId(profile),
    isAuthenticated: Boolean(profile.user_id),
    intent_score: profile.intent_score,
    user_type: profile.user_type as LeadUserType,
    predicted_buy_window: profile.predicted_buy_window,
    estimated_affordability_band: (profile.estimated_affordability_band ?? "entry") as AffordabilityBand,
    strongestCarLabel: getStrongestCarLabel(profile.strongest_interest_car_id),
    strongest_interest_car_id: profile.strongest_interest_car_id,
    favorite_brand: profile.favorite_brand,
    favorite_body_type: profile.favorite_body_type,
    visit_count: profile.visit_count,
    emi_usage_count: profile.emi_usage_count,
    compare_count: profile.compare_count,
    inferred_buyer_style: profile.inferred_buyer_style,
    inferred_buyer_style_confidence: profile.inferred_buyer_style_confidence,
    inferred_buyer_style_reason: profile.inferred_buyer_style_reason,
    last_activity_at: profile.last_activity_at,
    journey_stage: journey.stage,
    journey_stage_reason: journey.reason,
    total_page_views: countEvent(events, "page_view"),
    total_conversion_events: conversionCount,
    primary_paths: getTopPaths(events),
    crm_status: crm?.status ?? "new",
    crm_priority: crm?.priority ?? "medium",
    crm_owner_name: crm?.owner_name ?? null,
    crm_tags: crm?.tags ?? [],
    last_contacted_at: crm?.last_contacted_at ?? null,
    next_follow_up_at: crm?.next_follow_up_at ?? null,
  };
}

async function getProfiles(limit = 500): Promise<UserIntentProfileRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_intent_profiles")
    .select(
      "id, user_id, session_id, intent_score, user_type, predicted_buy_window, " +
      "estimated_affordability_band, strongest_interest_car_id, favorite_brand, favorite_body_type, " +
      "visit_count, emi_usage_count, compare_count, inferred_buyer_style, " +
      "inferred_buyer_style_confidence, inferred_buyer_style_reason, last_activity_at, updated_at"
    )
    .order("intent_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[crm] failed to fetch user_intent_profiles:", error.message);
    return [];
  }

  return (data ?? []) as unknown as UserIntentProfileRow[];
}

async function getProfileById(profileId: string): Promise<UserIntentProfileRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_intent_profiles")
    .select(
      "id, user_id, session_id, intent_score, user_type, predicted_buy_window, " +
      "estimated_affordability_band, strongest_interest_car_id, favorite_brand, favorite_body_type, " +
      "visit_count, emi_usage_count, compare_count, inferred_buyer_style, " +
      "inferred_buyer_style_confidence, inferred_buyer_style_reason, last_activity_at, updated_at"
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[crm] failed to fetch one user_intent_profile:", error.message);
    return null;
  }

  return (data ?? null) as UserIntentProfileRow | null;
}

async function getCrmLeadMap(profileIds: string[]): Promise<Map<string, CrmLeadRecordRow>> {
  if (profileIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_leads")
    .select("*")
    .in("profile_id", profileIds);

  if (error) {
    console.error("[crm] crm_leads unavailable or unreadable:", error.message);
    return new Map();
  }

  const map = new Map<string, CrmLeadRecordRow>();
  for (const row of (data ?? []) as CrmLeadRecordRow[]) {
    map.set(row.profile_id, row);
  }
  return map;
}

async function getEventMap(profiles: UserIntentProfileRow[]): Promise<Map<string, EventRow[]>> {
  const admin = createAdminClient();
  const userIds = profiles.map((profile) => profile.user_id).filter(Boolean) as string[];
  const sessionIds = profiles.map((profile) => profile.session_id).filter(Boolean) as string[];

  const [userEventsResult, sessionEventsResult] = await Promise.all([
    userIds.length > 0
      ? admin
          .from("user_events")
          .select("id, user_id, session_id, car_id, event_type, event_value, page_path, created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
          .limit(5000)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length > 0
      ? admin
          .from("user_events")
          .select("id, user_id, session_id, car_id, event_type, event_value, page_path, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false })
          .limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (userEventsResult.error) {
    console.error("[crm] failed to fetch user events:", userEventsResult.error.message);
  }
  if (sessionEventsResult.error) {
    console.error("[crm] failed to fetch session events:", sessionEventsResult.error.message);
  }

  const map = new Map<string, EventRow[]>();
  const allEvents = [
    ...((userEventsResult.data ?? []) as EventRow[]),
    ...((sessionEventsResult.data ?? []) as EventRow[]),
  ];

  for (const event of allEvents) {
    const key = getIdentityKey(event.user_id, event.session_id);
    const bucket = map.get(key) ?? [];
    bucket.push(event);
    map.set(key, bucket);
  }

  return map;
}

export async function getCrmLeadList(limit = 500): Promise<CrmLeadListRow[]> {
  const profiles = await getProfiles(limit);
  const [crmMap, eventMap] = await Promise.all([
    getCrmLeadMap(profiles.map((profile) => profile.id)),
    getEventMap(profiles),
  ]);

  return profiles.map((profile) =>
    toLeadRow({
      profile,
      crm: crmMap.get(profile.id) ?? null,
      events: eventMap.get(getIdentityKey(profile.user_id, profile.session_id)) ?? [],
    })
  );
}

export async function getCrmLeadDetails(profileId: string): Promise<{
  lead: CrmLeadListRow | null;
  crm: CrmLeadRecordRow | null;
  notes: CrmLeadNoteRow[];
  events: EventRow[];
  testDriveBookings: TestDriveBookingRow[];
}> {
  const profile = await getProfileById(profileId);
  if (!profile) {
    return { lead: null, crm: null, notes: [], events: [], testDriveBookings: [] };
  }

  const admin = createAdminClient();
  const [crmMap, eventMap, notesResult, testDriveResult] = await Promise.all([
    getCrmLeadMap([profile.id]),
    getEventMap([profile]),
    admin
      .from("crm_lead_notes")
      .select("id, profile_id, author_user_id, body, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    admin
      .from("test_drive_bookings")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  if (notesResult.error) {
    console.error("[crm] crm_lead_notes unavailable or unreadable:", notesResult.error.message);
  }
  if (testDriveResult.error) {
    console.error("[crm] test_drive_bookings unavailable or unreadable:", testDriveResult.error.message);
  }

  const crm = crmMap.get(profile.id) ?? null;
  const events = eventMap.get(getIdentityKey(profile.user_id, profile.session_id)) ?? [];

  return {
    lead: toLeadRow({ profile, crm, events }),
    crm,
    notes: (notesResult.data ?? []) as CrmLeadNoteRow[],
    events,
    testDriveBookings: (testDriveResult.data ?? []) as TestDriveBookingRow[],
  };
}

export async function getRecentTestDriveBookings(limit = 50): Promise<TestDriveBookingRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("test_drive_bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[crm] failed to fetch test_drive_bookings:", error.message);
    return [];
  }

  return (data ?? []) as TestDriveBookingRow[];
}
