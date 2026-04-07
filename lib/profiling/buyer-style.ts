import { STRONG_CTA_EVENTS } from "@/lib/tracking/event-catalog";
import type { InferredBuyerStyle, UserEventType } from "@/types";

// Backward-compatible alias for local readability.
export type BuyerStyleSegment = InferredBuyerStyle;

type UserEventRecord = {
  event_type: UserEventType;
  car_id: string | null;
  event_value: Record<string, unknown> | null;
  page_path: string | null;
  created_at: string;
};

type ClassifierInput = {
  events: UserEventRecord[];
  compareCount: number;
  emiUsageCount: number;
  visitCount: number;
};

export type BuyerStyleInference = {
  inferredStyle: BuyerStyleSegment | null;
  confidence: number | null;
  reason: string | null;
};

function parseNumeric(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function toDateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function countByEvent(events: UserEventRecord[], eventType: UserEventType): number {
  return events.reduce((n, e) => n + (e.event_type === eventType ? 1 : 0), 0);
}

function getUniqueCarViews(events: UserEventRecord[]): number {
  const ids = new Set<string>();
  for (const event of events) {
    if ((event.event_type === "car_view" || event.event_type === "vehicle_view") && event.car_id) ids.add(event.car_id);
  }
  return ids.size;
}

function getTopCarStats(events: UserEventRecord[]): {
  topCarId: string | null;
  topCarViews: number;
  totalCarViews: number;
  topCarShare: number;
} {
  const counts = new Map<string, number>();

  for (const event of events) {
    if ((event.event_type !== "car_view" && event.event_type !== "vehicle_view") || !event.car_id) continue;
    counts.set(event.car_id, (counts.get(event.car_id) ?? 0) + 1);
  }

  let topCarId: string | null = null;
  let topCarViews = 0;
  let totalCarViews = 0;

  for (const [carId, views] of counts) {
    totalCarViews += views;
    if (views > topCarViews) {
      topCarViews = views;
      topCarId = carId;
    }
  }

  const topCarShare = totalCarViews > 0 ? topCarViews / totalCarViews : 0;

  return { topCarId, topCarViews, totalCarViews, topCarShare };
}

function getStrongCtaClicks(events: UserEventRecord[]): number {
  let count = 0;
  for (const event of events) {
    if (STRONG_CTA_EVENTS.includes(event.event_type)) {
      count += 1;
    }
  }
  return count;
}

function getCarDetailViews(events: UserEventRecord[]): number {
  let count = 0;
  for (const event of events) {
    const path = event.page_path ?? "";
    if (path.startsWith("/cars/")) count += 1;
  }
  return count;
}

function getReturnVisitCount(events: UserEventRecord[]): number {
  return countByEvent(events, "repeat_visit");
}

function getPriceSensitiveSignals(events: UserEventRecord[]): {
  lowPriceFilterCount: number;
  emiLoweringSteps: number;
  depositLoweringSteps: number;
} {
  const lowPriceFilterCount = events.reduce((n, event) => {
    if (event.event_type !== "price_filter_used" && event.event_type !== "filter_used") return n;
    const value = event.event_value ?? {};
    const max = parseNumeric(value.budget_max);
    // Treat <= 30k as explicitly price-sensitive exploration for this market setup.
    if (max !== null && max <= 30000) return n + 1;
    return n;
  }, 0);

  const emiEvents = events
    .filter((e) => e.event_type === "emi_used")
    .sort((a, b) => (toDateMs(a.created_at) ?? 0) - (toDateMs(b.created_at) ?? 0));

  let emiLoweringSteps = 0;
  let depositLoweringSteps = 0;

  for (let i = 1; i < emiEvents.length; i += 1) {
    const prev = emiEvents[i - 1]?.event_value ?? {};
    const curr = emiEvents[i]?.event_value ?? {};

    const prevEmi = parseNumeric(prev.estimated_monthly_emi);
    const currEmi = parseNumeric(curr.estimated_monthly_emi);
    if (prevEmi !== null && currEmi !== null && currEmi < prevEmi) {
      emiLoweringSteps += 1;
    }

    const prevDeposit = parseNumeric(prev.deposit);
    const currDeposit = parseNumeric(curr.deposit);
    if (prevDeposit !== null && currDeposit !== null && currDeposit < prevDeposit) {
      depositLoweringSteps += 1;
    }
  }

  return { lowPriceFilterCount, emiLoweringSteps, depositLoweringSteps };
}

/**
 * Rule-based, transparent, and intentionally conservative.
 *
 * This is not a psychological diagnosis. It is a soft inference from interaction
 * patterns, designed to be explainable and easy to replace with ML later.
 */
export function inferBuyerStyle(input: ClassifierInput): BuyerStyleInference {
  const events = input.events;

  if (events.length === 0) {
    return {
      inferredStyle: null,
      confidence: null,
      reason: "Insufficient behavioral data.",
    };
  }

  const uniqueCars = getUniqueCarViews(events);
  const topCar = getTopCarStats(events);
  const strongCtaClicks = getStrongCtaClicks(events);
  const carDetailViews = getCarDetailViews(events);
  const returnVisits = getReturnVisitCount(events);
  const priceSignals = getPriceSensitiveSignals(events);

  const styleScores: Record<BuyerStyleSegment, number> = {
    analytical_buyer: 0,
    emotional_buyer: 0,
    price_sensitive_buyer: 0,
    urgent_buyer: 0,
  };

  // analytical buyer: compare breadth + detail reading + EMI tooling use
  styleScores.analytical_buyer += input.compareCount >= 2 ? 0.35 : 0;
  styleScores.analytical_buyer += uniqueCars >= 3 ? 0.25 : 0;
  styleScores.analytical_buyer += input.emiUsageCount >= 1 ? 0.2 : 0;
  styleScores.analytical_buyer += carDetailViews >= 3 ? 0.2 : 0;

  // emotional buyer: repeated focus on one car + CTA engagement
  styleScores.emotional_buyer += topCar.topCarViews >= 3 ? 0.35 : 0;
  styleScores.emotional_buyer += topCar.topCarShare >= 0.7 ? 0.35 : 0;
  styleScores.emotional_buyer += strongCtaClicks >= 1 ? 0.2 : 0;
  styleScores.emotional_buyer += input.compareCount === 0 ? 0.1 : 0;

  // price-sensitive buyer: low-price filters + decreasing EMI/deposit adjustments
  styleScores.price_sensitive_buyer += priceSignals.lowPriceFilterCount >= 2 ? 0.45 : 0;
  styleScores.price_sensitive_buyer += priceSignals.emiLoweringSteps >= 1 ? 0.25 : 0;
  styleScores.price_sensitive_buyer += priceSignals.depositLoweringSteps >= 1 ? 0.2 : 0;
  styleScores.price_sensitive_buyer += input.emiUsageCount >= 2 ? 0.1 : 0;

  // urgent buyer: repeat visits + strong CTA actions in short cycles
  styleScores.urgent_buyer += returnVisits >= 2 ? 0.4 : 0;
  styleScores.urgent_buyer += strongCtaClicks >= 2 ? 0.35 : 0;
  styleScores.urgent_buyer += input.visitCount >= 8 ? 0.15 : 0;
  styleScores.urgent_buyer += topCar.topCarViews >= 2 ? 0.1 : 0;

  const ranked = (Object.entries(styleScores) as [BuyerStyleSegment, number][])
    .sort((a, b) => b[1] - a[1]);

  const [bestStyle, bestScore] = ranked[0] ?? ["analytical_buyer", 0];
  const [, secondScore] = ranked[1] ?? ["analytical_buyer", 0];

  // Need a minimum signal level before assigning a segment.
  if (bestScore < 0.5) {
    return {
      inferredStyle: null,
      confidence: null,
      reason: "Signals are too weak to infer a stable style.",
    };
  }

  // Confidence reflects both absolute score and separation from runner-up.
  const confidence = round3(clamp01(bestScore * 0.75 + Math.max(0, bestScore - secondScore) * 0.5));

  const reasonsByStyle: Record<BuyerStyleSegment, string> = {
    analytical_buyer:
      "Inferred from broad comparing behavior, repeated car-detail views, and EMI tool usage.",
    emotional_buyer:
      "Inferred from repeated focus on one car and action-oriented CTA engagement.",
    price_sensitive_buyer:
      "Inferred from low-budget filtering and repeated attempts to reduce EMI/down payment.",
    urgent_buyer:
      "Inferred from frequent return visits and multiple strong purchase-intent CTA clicks.",
  };

  return {
    inferredStyle: bestStyle,
    confidence,
    reason: reasonsByStyle[bestStyle],
  };
}
