import type { PersonalizedVehicleCard, VehicleListingSegment } from "@/types";

export type SegmentHint =
  | "casual_explorer"
  | "budget_focused"
  | "value_seeker"
  | "premium_intent"
  | "finance_interested"
  | "high_intent_buyer";

export type RecommendedStrip = {
  label: string;
  description: string;
  vehicles: PersonalizedVehicleCard[];
};

/** Compute display badge for a vehicle if admin hasn't set one */
export function computeDisplayBadge(vehicle: PersonalizedVehicleCard): string | null {
  if (vehicle.badge) return vehicle.badge;
  if (vehicle.rangeKm >= 500) return "Long Range";
  if (vehicle.seats >= 7) return "Family Pick";
  if (vehicle.price <= 28000) return "City Friendly";
  if (vehicle.tier === "premium") return "Premium Choice";
  // Best value: high range-per-£
  const valueScore = vehicle.rangeKm / (vehicle.price / 1000);
  if (valueScore >= 14) return "Best Value";
  return null;
}

/** Decorate all vehicles with displayBadge */
export function decorateWithBadges(
  vehicles: PersonalizedVehicleCard[],
): PersonalizedVehicleCard[] {
  return vehicles.map((v) => ({
    ...v,
    displayBadge: computeDisplayBadge(v),
  }));
}

/**
 * Build a "Recommended for You" strip personalised to segment.
 * Falls back to sensible defaults for new/casual visitors.
 */
export function buildRecommendedStrip(
  vehicles: PersonalizedVehicleCard[],
  segment: VehicleListingSegment,
): RecommendedStrip {
  const sorted = [...vehicles].sort((a, b) => b.recommendationScore - a.recommendationScore);

  if (segment === "high_intent") {
    return {
      label: "Top Picks for You",
      description: "Based on your browsing — these match your interests closely.",
      vehicles: sorted.slice(0, 4),
    };
  }

  if (segment === "interested") {
    return {
      label: "Popular with Explorers Like You",
      description: "Vehicles that earn high attention and great reviews.",
      vehicles: sorted.slice(0, 4),
    };
  }

  // Casual / new visitor — show best value affordable first
  const affordable = sorted.filter((v) => v.tier === "affordable");
  const mid = sorted.filter((v) => v.tier === "mid");
  const picks = [...affordable.slice(0, 2), ...mid.slice(0, 2)];

  return {
    label: "Great Picks to Start With",
    description: "Popular EVs across every budget — a smart starting point.",
    vehicles: picks.length >= 2 ? picks : sorted.slice(0, 4),
  };
}

/**
 * Infer lightweight segment hints from behavior counters.
 * These are heuristics — not deterministic.
 */
export function inferSegmentHints(params: {
  affordableViews: number;
  premiumViews: number;
  financeClicks: number;
  compareClicks: number;
  totalViews: number;
  repeatVisits: number;
}): SegmentHint[] {
  const hints: SegmentHint[] = [];

  if (params.totalViews > 0 && params.affordableViews / params.totalViews >= 0.6) {
    hints.push("budget_focused");
  }
  if (params.totalViews > 0 && params.premiumViews / params.totalViews >= 0.5) {
    hints.push("premium_intent");
  }
  if (params.financeClicks >= 2) {
    hints.push("finance_interested");
  }
  if (params.compareClicks >= 2 && params.totalViews >= 3) {
    hints.push("high_intent_buyer");
  }
  // Ambivalent explorer
  if (hints.length === 0 && params.totalViews >= 2) {
    hints.push("value_seeker");
  }
  if (hints.length === 0) {
    hints.push("casual_explorer");
  }

  return hints;
}
