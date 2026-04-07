import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveIdentityFilter,
  type TrackingIdentity,
} from "@/lib/tracking/identity-shared";

type UserCarInterestRecord = {
  id: string;
  total_views_per_car: number;
};

type CarInterestUpsertResult = {
  totalViewsPerCar: number;
  isRepeatVisit: boolean;
  isHighInterest: boolean;
};

/**
 * Updates per-car view summary and returns whether this view is a repeat visit.
 */
export async function upsertUserCarInterestOnCarView(input: {
  identity: TrackingIdentity;
  carId: string;
  occurredAtIso?: string;
}): Promise<CarInterestUpsertResult | null> {
  const filter = resolveIdentityFilter(input.identity);
  if (!filter) return null;

  const admin = createAdminClient();
  const occurredAt = input.occurredAtIso ?? new Date().toISOString();

  const query = admin
    .from("user_car_interest")
    .select("id, total_views_per_car")
    .eq("car_id", input.carId)
    .eq(filter.column, filter.value)
    .maybeSingle();

  const { data: existing, error: existingError } = await query;

  if (existingError) {
    console.error("[car-interest] failed to read existing summary:", existingError.message);
    return null;
  }

  const current = existing as UserCarInterestRecord | null;

  if (!current) {
    const { error: insertError } = await admin.from("user_car_interest").insert({
      user_id: input.identity.userId,
      session_id: input.identity.sessionId,
      car_id: input.carId,
      first_seen_at: occurredAt,
      last_seen_at: occurredAt,
      total_views_per_car: 1,
      high_interest: false,
    });

    if (insertError) {
      console.error("[car-interest] failed to create summary row:", insertError.message);
      return null;
    }

    return {
      totalViewsPerCar: 1,
      isRepeatVisit: false,
      isHighInterest: false,
    };
  }

  const nextViews = current.total_views_per_car + 1;
  const nextHighInterest = nextViews >= 2;

  const { error: updateError } = await admin
    .from("user_car_interest")
    .update({
      total_views_per_car: nextViews,
      last_seen_at: occurredAt,
      high_interest: nextHighInterest,
    })
    .eq("id", current.id);

  if (updateError) {
    console.error("[car-interest] failed to update summary row:", updateError.message);
    return null;
  }

  return {
    totalViewsPerCar: nextViews,
    isRepeatVisit: true,
    isHighInterest: nextHighInterest,
  };
}

export async function getTopInterestedCarId(identity: TrackingIdentity): Promise<string | null> {
  const filter = resolveIdentityFilter(identity);
  if (!filter) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_car_interest")
    .select("car_id")
    .eq(filter.column, filter.value)
    .order("high_interest", { ascending: false })
    .order("total_views_per_car", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[car-interest] failed to read top interested car:", error.message);
    return null;
  }

  return (data?.car_id as string | null) ?? null;
}
