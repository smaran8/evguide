/**
 * lib/scoring/recommendation.ts
 *
 * Pure scoring logic for the AI recommendation engine.
 * This file has NO database calls or side effects — it is just
 * deterministic math over EV data and user preferences.
 *
 * Architecture decision: keeping scoring pure makes it easy
 * to unit-test and swap out algorithms later without touching
 * components or server actions.
 */

import { evModels } from "@/data/evModels";
import type { EVModel, UserPreferences, RecommendationResult } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Body type map
// The EVModel data doesn't include a body type field, so we map by known IDs.
// Any unmapped ID defaults to "suv" (most common EV body style).
// ─────────────────────────────────────────────────────────────────────────────
const BODY_TYPE_MAP: Record<string, "suv" | "hatchback" | "sedan"> = {
  "byd-atto-3":            "suv",
  "byd-dolphin":           "hatchback",
  "byd-sealion-7":         "suv",
  "tesla-model-3":         "sedan",
  "tesla-model-y":         "suv",
  "omoda-e5":              "suv",
  "kia-ev6":               "suv",
  "hyundai-kona-electric": "suv",
  "mg-zs-ev":              "suv",
  "bmw-i4":                "sedan",
  "volvo-ex30":            "suv",
  "nissan-leaf":           "hatchback",
};

function getBodyType(ev: EVModel): "suv" | "hatchback" | "sedan" {
  return BODY_TYPE_MAP[ev.id] ?? "suv";
}

// ─────────────────────────────────────────────────────────────────────────────
// EMI calculator (exported so the server action and UI can share the formula)
//
// Uses the standard reducing-balance (amortisation) formula:
//   EMI = P × r × (1 + r)^n  /  ((1 + r)^n − 1)
// where:
//   P = principal (price − down payment)
//   r = monthly interest rate (annual rate ÷ 12)
//   n = tenure in months
// ─────────────────────────────────────────────────────────────────────────────
const ANNUAL_RATE_PERCENT = 8;   // 8 % p.a. — typical UK EV loan rate
const TENURE_MONTHS       = 60;  // 5-year loan

export function calculateMonthlyEmi(price: number, downPayment: number): number {
  const principal = Math.max(0, price - downPayment);
  if (principal === 0) return 0;

  const r   = ANNUAL_RATE_PERCENT / 100 / 12;
  const n   = TENURE_MONTHS;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  return Math.round(emi);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring dimension helpers
// Each returns a score and an array of plain-English reason strings.
// ─────────────────────────────────────────────────────────────────────────────

type DimensionResult = { score: number; reasons: string[] };

/**
 * Affordability dimension — max 35 points
 * Checks whether price is within total budget and whether the estimated
 * monthly EMI is close to the user's target.
 */
function scoreAffordability(ev: EVModel, prefs: UserPreferences): DimensionResult {
  const reasons: string[] = [];

  // Hard rejection: price exceeds total budget
  if (ev.price > prefs.totalBudget) {
    return { score: 0, reasons: [] };
  }

  const emi   = calculateMonthlyEmi(ev.price, prefs.downPayment);
  const ratio = emi / prefs.preferredMonthlyEmi; // ratio > 1 means over-budget EMI

  let score: number;

  if (ratio <= 1.0) {
    score = 35;
    reasons.push(`EMI of £${emi.toLocaleString()}/mo fits within your target`);
  } else if (ratio <= 1.1) {
    score = 28;
    reasons.push(`EMI is £${emi.toLocaleString()}/mo — just slightly above your target`);
  } else if (ratio <= 1.25) {
    score = 18;
    reasons.push(`EMI of £${emi.toLocaleString()}/mo is manageable with some stretch`);
  } else {
    score = 8; // Still within total budget, but EMI is demanding
  }

  reasons.push(`Priced at £${ev.price.toLocaleString()} — within your £${prefs.totalBudget.toLocaleString()} budget`);

  return { score, reasons };
}

/**
 * Usage / range dimension — max 25 points
 * Scores how well the vehicle's kilometre range suits the user's
 * stated driving pattern (city, highway, or mixed).
 */
function scoreUsage(ev: EVModel, prefs: UserPreferences): DimensionResult {
  const reasons: string[] = [];
  const { rangeKm } = ev;
  let score = 0;

  switch (prefs.usageType) {
    case "city":
      // City drivers rarely exceed 80–120 km/day; 300+ km is more than enough
      if (rangeKm >= 340) { score = 25; reasons.push(`${rangeKm}km range is more than enough for city driving`); }
      else if (rangeKm >= 220) { score = 20; reasons.push(`${rangeKm}km range comfortably covers daily city trips`); }
      else { score = 10; reasons.push(`${rangeKm}km range is modest but workable for short city hops`); }
      break;

    case "highway":
      // Motorway trips need 400+ km for comfort between charging stops
      if (rangeKm >= 450) { score = 25; reasons.push(`Excellent ${rangeKm}km range — fewer charging stops on long journeys`); }
      else if (rangeKm >= 380) { score = 19; reasons.push(`${rangeKm}km range handles most UK highway trips`); }
      else if (rangeKm >= 300) { score = 11; reasons.push(`${rangeKm}km range may require planning stops on longer routes`); }
      else { score = 5; }
      break;

    case "mixed":
      // Mixed needs a balanced 360+ km
      if (rangeKm >= 410) { score = 25; reasons.push(`${rangeKm}km range handles both commuting and weekend drives`); }
      else if (rangeKm >= 330) { score = 19; reasons.push(`${rangeKm}km suits a mix of city and highway use`); }
      else if (rangeKm >= 250) { score = 12; reasons.push(`${rangeKm}km range covers mixed daily driving`); }
      else { score = 5; }
      break;
  }

  return { score, reasons };
}

/**
 * Charging fitness dimension — max 20 points
 * Scores compatibility with the user's charging access situation.
 */
function scoreCharging(ev: EVModel, prefs: UserPreferences): DimensionResult {
  const reasons: string[] = [];
  const hasCCS = ev.chargingStandard.toLowerCase().includes("ccs");
  let score = 0;

  switch (prefs.chargingAccess) {
    case "home":
      // Any EV works well with a home wallbox
      score = 20;
      reasons.push("Compatible with home EV charger installation");
      break;

    case "public":
      // CCS is the dominant UK/EU public charging standard (>95% of rapid chargers)
      if (hasCCS) {
        score = 20;
        reasons.push("CCS charging — works at virtually all UK public rapid chargers");
      } else {
        score = 10;
        reasons.push("Non-CCS standard; fewer compatible rapid charge points in the UK");
      }
      break;

    case "none":
      // No dedicated charging access: a larger battery means less frequent top-up trips
      if (ev.batteryKWh >= 70) {
        score = 17;
        reasons.push(`Large ${ev.batteryKWh}kWh battery reduces how often you need to find a charger`);
      } else if (ev.batteryKWh >= 55) {
        score = 11;
        reasons.push(`${ev.batteryKWh}kWh battery is reasonable without dedicated charging`);
      } else {
        score = 5;
        reasons.push("Smaller battery may need frequent top-ups without a home charger");
      }
      break;
  }

  return { score, reasons };
}

/**
 * Family suitability dimension — max 20 points
 * Checks seat count against family size and boot space against luggage needs.
 */
function scoreFamilySuitability(ev: EVModel, prefs: UserPreferences): DimensionResult {
  const reasons: string[] = [];
  const { familySize } = prefs;
  const { seats, bootLitres } = ev;

  // ── Seat score (0–10) ──
  const seatScore = seats >= familySize ? 10 : familySize - seats <= 1 ? 5 : 1;

  // ── Boot score (0–10) ──
  // Threshold grows with family size
  const bootThreshold = familySize <= 2 ? 280 : familySize <= 4 ? 380 : 480;
  const bootScore =
    bootLitres >= bootThreshold       ? 10 :
    bootLitres >= bootThreshold * 0.8 ? 6  : 2;

  const score = seatScore + bootScore;

  if (seatScore >= 8) {
    reasons.push(`${seats} seats comfortably fits a family of ${familySize}`);
  }
  if (bootScore >= 8) {
    reasons.push(`${bootLitres}L boot handles family luggage with ease`);
  } else if (bootScore >= 5) {
    reasons.push(`${bootLitres}L boot is workable for moderate luggage`);
  }

  return { score, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main public function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score every candidate EV against the user's preferences and return the
 * top 3 matches, ranked best-to-worst.
 *
 * @param prefs     - Collected user preferences from the wizard form
 * @param candidates - Array of EV models to score (defaults to local data)
 * @returns         - Array of up to 3 RecommendationResult objects
 */
export function getTopRecommendations(
  prefs: UserPreferences,
  candidates: EVModel[] = evModels,
): RecommendationResult[] {
  const scored = candidates.map((ev) => {
    // Run each scoring dimension independently
    const affordability = scoreAffordability(ev, prefs);
    const usage         = scoreUsage(ev, prefs);
    const charging      = scoreCharging(ev, prefs);
    const family        = scoreFamilySuitability(ev, prefs);

    // Sum the four dimensions (max = 35 + 25 + 20 + 20 = 100)
    const rawScore = affordability.score + usage.score + charging.score + family.score;

    // Body type preference acts as a multiplier so mismatches still appear
    // but rank lower — they're a fallback if nothing better matches
    const bodyType =
      prefs.preferredBodyType === "any" || getBodyType(ev) === prefs.preferredBodyType
        ? 1.0
        : 0.55;

    const finalScore = Math.min(100, Math.round(rawScore * bodyType));

    // Collect all reasons, remove duplicates, limit to 4 for clean UI
    const allReasons = [
      ...affordability.reasons,
      ...usage.reasons,
      ...charging.reasons,
      ...family.reasons,
    ].filter(Boolean);
    const reasons = [...new Set(allReasons)].slice(0, 4);

    return {
      ev,
      score:        finalScore,
      estimatedEmi: calculateMonthlyEmi(ev.price, prefs.downPayment),
      reasons,
    };
  });

  // Sort descending by score, take the top 3
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item, i) => ({
      ...item,
      rank: (i + 1) as 1 | 2 | 3,
    }));
}
