import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveIdentityFilter,
  type TrackingIdentity,
} from "@/lib/tracking/identity-shared";
import { FINANCIAL_PROFILE_SIGNAL_EVENTS } from "@/lib/tracking/event-catalog";
import type { AffordabilityBand, UserEventType } from "@/types";

type UserEventRecord = {
  event_type: UserEventType;
  event_value: Record<string, unknown> | null;
};

type NumericSnapshot = {
  budgetMin: number | null;
  budgetMax: number | null;
  emi: number | null;
  downPayment: number | null;
};

function parseNumeric(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value >= 0 ? value : null;
}

function estimateAffordabilityBand(snapshot: NumericSnapshot): AffordabilityBand {
  // Ethical/transparency principle:
  // This uses only explicit interaction signals (budget/EMI/deposit), not inferred salary.
  if (snapshot.budgetMax !== null) {
    if (snapshot.budgetMax <= 30000) return "entry";
    if (snapshot.budgetMax <= 60000) return "mid";
    return "premium";
  }

  if (snapshot.emi !== null) {
    if (snapshot.emi <= 350) return "entry";
    if (snapshot.emi <= 800) return "mid";
    return "premium";
  }

  // Conservative default when interactions are too sparse.
  return "entry";
}

function extractFinancialSnapshot(events: UserEventRecord[]): NumericSnapshot {
  const snapshot: NumericSnapshot = {
    budgetMin: null,
    budgetMax: null,
    emi: null,
    downPayment: null,
  };

  for (const event of events) {
    const value = event.event_value ?? {};

    if (event.event_type === "price_filter_used") {
      if (snapshot.budgetMin === null) {
        snapshot.budgetMin = parseNumeric(value.budget_min);
      }
      if (snapshot.budgetMax === null) {
        snapshot.budgetMax = parseNumeric(value.budget_max);
      }
    }

    if (event.event_type === "emi_used") {
      if (snapshot.budgetMax === null) {
        snapshot.budgetMax = parseNumeric(value.price);
      }
      if (snapshot.emi === null) {
        snapshot.emi = parseNumeric(value.estimated_monthly_emi);
      }
      if (snapshot.downPayment === null) {
        snapshot.downPayment = parseNumeric(value.deposit);
      }
    }

    if (event.event_type === "loan_offer_clicked") {
      if (snapshot.emi === null) {
        snapshot.emi = parseNumeric(value.estimated_monthly_emi);
      }
      if (snapshot.downPayment === null) {
        snapshot.downPayment = parseNumeric(value.down_payment);
      }
      if (snapshot.budgetMax === null) {
        snapshot.budgetMax = parseNumeric(value.selected_vehicle_price);
      }
    }

    if (
      snapshot.budgetMin !== null &&
      snapshot.budgetMax !== null &&
      snapshot.emi !== null &&
      snapshot.downPayment !== null
    ) {
      break;
    }
  }

  return snapshot;
}

export async function refreshFinancialProfileForIdentity(identity: TrackingIdentity): Promise<void> {
  const filter = resolveIdentityFilter(identity);
  if (!filter) return;

  const admin = createAdminClient();
  const { data: events, error } = await admin
    .from("user_events")
    .select("event_type, event_value")
    .eq(filter.column, filter.value)
    .in("event_type", FINANCIAL_PROFILE_SIGNAL_EVENTS)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    console.error("[financial-profile] failed to read events:", error.message);
    return;
  }

  const allEvents = (events ?? []) as UserEventRecord[];
  if (allEvents.length === 0) return;

  const snapshot = extractFinancialSnapshot(allEvents);
  const affordabilityBand = estimateAffordabilityBand(snapshot);

  const payload = {
    user_id: identity.userId,
    session_id: identity.sessionId,
    preferred_budget_min: snapshot.budgetMin,
    preferred_budget_max: snapshot.budgetMax,
    preferred_emi: snapshot.emi,
    preferred_down_payment: snapshot.downPayment,
    estimated_affordability_band: affordabilityBand,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("user_financial_profiles")
    .select("id")
    .eq(filter.column, filter.value)
    .maybeSingle();

  const write = existing
    ? admin.from("user_financial_profiles").update(payload).eq("id", existing.id)
    : admin.from("user_financial_profiles").insert(payload);

  const { error: upsertError } = await write;

  if (upsertError) {
    console.error("[financial-profile] failed to upsert profile:", upsertError.message);
  }
}

export async function upsertFinancialProfileFromRecommendation(input: {
  userId: string;
  totalBudget: number;
  preferredMonthlyEmi: number;
  downPayment: number;
}): Promise<void> {
  const admin = createAdminClient();
  const band = estimateAffordabilityBand({
    budgetMin: null,
    budgetMax: input.totalBudget,
    emi: input.preferredMonthlyEmi,
    downPayment: input.downPayment,
  });

  const payload = {
    user_id: input.userId,
    session_id: null,
    preferred_budget_min: null,
    preferred_budget_max: input.totalBudget,
    preferred_emi: input.preferredMonthlyEmi,
    preferred_down_payment: input.downPayment,
    estimated_affordability_band: band,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("user_financial_profiles")
    .select("id")
    .eq("user_id", input.userId)
    .maybeSingle();

  const write = existing
    ? admin.from("user_financial_profiles").update(payload).eq("id", existing.id)
    : admin.from("user_financial_profiles").insert(payload);

  const { error } = await write;

  if (error) {
    console.error("[financial-profile] failed to persist recommendation profile:", error.message);
  }
}
