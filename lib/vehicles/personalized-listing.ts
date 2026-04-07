import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TRACKING_SESSION_ID_KEY } from "@/lib/tracking/identity";
import type {
  EVModel,
  PersonalizedVehicleCard,
  UserEventType,
  VehicleListingSegment,
  VehicleTier,
} from "@/types";

type ListingEvent = {
  event_type: UserEventType;
  car_id: string | null;
  event_value: Record<string, unknown> | null;
  page_path: string | null;
  created_at: string;
};

export type VehicleListingContext = {
  segment: VehicleListingSegment;
  preferredTier: VehicleTier;
  financeFocused: boolean;
  compareClicks: number;
  emiUsageCount: number;
  viewCount: number;
};

function estimateMonthlyEmi(price: number): number {
  return Math.round((price * 0.8) / 60);
}

function getVehicleTierForEvent(
  event: ListingEvent,
  vehicleTierById: Map<string, VehicleTier>,
): VehicleTier | null {
  const explicitTier = event.event_value?.vehicle_tier;
  if (explicitTier === "affordable" || explicitTier === "mid" || explicitTier === "premium") {
    return explicitTier;
  }

  if (!event.car_id) return null;
  return vehicleTierById.get(event.car_id) ?? null;
}

function inferListingContext(events: ListingEvent[], vehicles: EVModel[]): VehicleListingContext {
  if (events.length === 0) {
    return {
      segment: "casual",
      preferredTier: "affordable",
      financeFocused: false,
      compareClicks: 0,
      emiUsageCount: 0,
      viewCount: 0,
    };
  }

  const vehicleTierById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.tier] as const));
  const tierScores: Record<VehicleTier, number> = {
    affordable: 0,
    mid: 0,
    premium: 0,
  };

  let compareClicks = 0;
  let emiUsageCount = 0;
  let filterCount = 0;
  let viewCount = 0;

  for (const event of events) {
    if (event.event_type === "compare_clicked") compareClicks += 1;
    if (event.event_type === "emi_used") emiUsageCount += 1;
    if (event.event_type === "filter_used" || event.event_type === "price_filter_used") {
      filterCount += 1;
    }

    const tier = getVehicleTierForEvent(event, vehicleTierById);

    if (event.event_type === "vehicle_view" || event.event_type === "car_view") {
      viewCount += 1;
      if (tier) tierScores[tier] += 2;
    }

    if (!tier) continue;

    if (event.event_type === "compare_clicked") tierScores[tier] += 3;
    if (event.event_type === "emi_used") tierScores[tier] += tier === "affordable" ? 3 : 1;
    if (event.event_type === "filter_used" || event.event_type === "price_filter_used") {
      tierScores[tier] += 2;
    }
  }

  const preferredTier =
    (Object.entries(tierScores).sort((a, b) => b[1] - a[1])[0]?.[0] as VehicleTier | undefined) ??
    "affordable";

  const segment: VehicleListingSegment =
    emiUsageCount > 0 || compareClicks >= 2 || viewCount >= 6
      ? "high_intent"
      : compareClicks > 0 || filterCount > 0 || viewCount >= 2
        ? "interested"
        : "casual";

  return {
    segment,
    preferredTier,
    financeFocused: emiUsageCount > 0,
    compareClicks,
    emiUsageCount,
    viewCount,
  };
}

function buildWhyRecommended(
  vehicle: EVModel,
  context: VehicleListingContext,
  lowestPrice: number,
): string {
  if (context.financeFocused && vehicle.tier === "affordable") {
    return "Finance-friendly monthly estimate";
  }
  if (vehicle.tier === context.preferredTier) {
    return `${vehicle.tier === "mid" ? "Best-value" : vehicle.tier} match for your browsing`;
  }
  if (vehicle.rangeKm >= 480) {
    return "Strong long-range option";
  }
  if (vehicle.price === lowestPrice) {
    return "Great entry-point EV";
  }
  return "Popular fit for your journey";
}

function scoreVehicle(vehicle: EVModel, context: VehicleListingContext): number {
  let score = 0;

  if (context.segment === "casual") {
    score += vehicle.tier === "affordable" ? 40 : vehicle.tier === "mid" ? 20 : 10;
  }

  if (vehicle.tier === context.preferredTier) score += 35;
  if (context.financeFocused && vehicle.tier === "affordable") score += 25;
  if (context.financeFocused && estimateMonthlyEmi(vehicle.price) <= 550) score += 20;
  if (!context.financeFocused && vehicle.rangeKm >= 450) score += 15;
  if (context.compareClicks > 0 && vehicle.tier === "mid") score += 10;

  score += Math.max(0, 12 - vehicle.price / 6000);
  score += Math.min(12, vehicle.rangeKm / 50);

  return Math.round(score);
}

export async function getVehicleListingContext(vehicles: EVModel[]): Promise<VehicleListingContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const rawSessionId = cookieStore.get(TRACKING_SESSION_ID_KEY)?.value ?? null;
  const sessionId = rawSessionId ? decodeURIComponent(rawSessionId).trim() || null : null;

  if (!user?.id && !sessionId) {
    return inferListingContext([], vehicles);
  }

  const admin = createAdminClient();
  const query = admin
    .from("user_events")
    .select("event_type, car_id, event_value, page_path, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const scopedQuery = user?.id ? query.eq("user_id", user.id) : query.eq("session_id", sessionId!);
  const { data, error } = await scopedQuery;

  if (error) {
    console.error("[vehicles] failed to fetch listing events:", error.message);
    return inferListingContext([], vehicles);
  }

  return inferListingContext((data ?? []) as ListingEvent[], vehicles);
}

export function buildPersonalizedVehicleCards(
  vehicles: EVModel[],
  context: VehicleListingContext,
): PersonalizedVehicleCard[] {
  const lowestPrice = vehicles.reduce(
    (currentLowest, vehicle) => Math.min(currentLowest, vehicle.price),
    Number.POSITIVE_INFINITY,
  );

  return vehicles.map((vehicle) => ({
    ...vehicle,
    estimatedEmi: estimateMonthlyEmi(vehicle.price),
    recommendationScore: scoreVehicle(vehicle, context),
    whyRecommended: buildWhyRecommended(vehicle, context, lowestPrice),
  }));
}
