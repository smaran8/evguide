/**
 * lib/recommendation-engine/engine.ts
 *
 * Pure, deterministic scoring engine for the consultation wizard.
 * Zero side effects — no DB calls, no fetch, no randomness.
 * Safe to run on server or in tests.
 *
 * Weighted dimensions (total = 100):
 *   budget_fit       25  — price within budget window
 *   range_fit        20  — real-world range vs daily mileage
 *   charging_fit     15  — home/public charging compatibility
 *   body_type_fit    15  — body style matches preference
 *   monthly_cost_fit 15  — estimated monthly cost vs target
 *   motivation_fit   10  — vehicle traits align with stated motivation
 */

import {
  calcAnnualEnergyCost,
  DEFAULT_ENERGY_RATE_PENCE,
  REAL_WORLD_FACTOR,
} from "@/lib/ev-intelligence";
import { evModels } from "@/data/evModels";
import type { EVModel } from "@/types";
import type { ConsultationFormState } from "@/types/consultation";
import type { ScoredVehicle, ScoringBreakdown, RecommendationOutput } from "./types";
import { buildExplanation } from "./explanation";

// ── Body type normalisation ───────────────────────────────────────────────────

const BODY_TYPE_MAP: Record<string, string> = {
  "byd-atto-3":              "suv",
  "byd-dolphin":             "hatchback",
  "byd-sealion-7":           "suv",
  "tesla-model-3":           "saloon",
  "tesla-model-y":           "suv",
  "kia-ev6":                 "suv",
  "hyundai-kona-electric":   "suv",
  "mg-zs-ev":                "suv",
  "mg4":                     "hatchback",
  "bmw-i4":                  "saloon",
  "volvo-ex30":              "suv",
  "nissan-leaf":             "hatchback",
  "omoda-e5":                "suv",
  "volkswagen-id4":          "suv",
  "volkswagen-id3":          "hatchback",
  "polestar-2":              "saloon",
  "audi-q4-e-tron":          "suv",
  "hyundai-ioniq-6":         "saloon",
  "kia-ev3":                 "hatchback",
};

function getBodyType(ev: EVModel): string {
  if (ev.bodyType) return ev.bodyType.toLowerCase();
  return BODY_TYPE_MAP[ev.id] ?? "suv";
}

// Normalise the user's preference to match our stored values
function normaliseBodyPref(pref: string | null): string | null {
  if (!pref) return null;
  const map: Record<string, string> = {
    saloon: "saloon",
    sedan: "saloon",
    city: "hatchback",
    estate: "suv",       // closest available type
    mpv:   "suv",
    suv:   "suv",
    hatchback: "hatchback",
  };
  return map[pref.toLowerCase()] ?? pref.toLowerCase();
}

// ── Premium / recognised brand set ───────────────────────────────────────────

const PREMIUM_BRANDS = new Set([
  "Tesla", "BMW", "Audi", "Mercedes", "Polestar", "Volvo", "Porsche", "Jaguar",
]);

const TECH_FORWARD_BRANDS = new Set([
  "Tesla", "Polestar", "BYD", "Hyundai", "Kia", "BMW",
]);

// ── Monthly cost estimate ─────────────────────────────────────────────────────

const DEFAULT_APR    = 9.9;
const DEFAULT_TERM   = 48;
const DEFAULT_DEPOSIT_PCT = 0.10;

function estimateMonthlyCost(ev: EVModel, consultation: ConsultationFormState): number {
  const annualMiles = consultation.yearly_miles ?? 7500;
  const publicMix   = consultation.home_charging === true ? 15 : 60;

  // PCP-style finance
  const deposit     = Math.round(ev.price * DEFAULT_DEPOSIT_PCT);
  const principal   = ev.price - deposit;
  const r           = DEFAULT_APR / 100 / 12;
  const n           = DEFAULT_TERM;
  const monthlyFinance =
    r > 0
      ? Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
      : Math.round(principal / n);

  // Running costs
  const annualEnergy     = calcAnnualEnergyCost(ev.batteryKWh, ev.rangeKm, annualMiles, DEFAULT_ENERGY_RATE_PENCE, publicMix);
  const monthlyEnergy    = Math.round(annualEnergy / 12);
  const monthlyInsurance = Math.round((ev.price < 30_000 ? 650 : ev.price < 45_000 ? 800 : 1_050) / 12);
  const monthlyServicing = 15; // £180/yr → £15/mo
  const monthlyVed       = ev.price > 40_000 ? Math.round(190 / 12) : 0;

  return monthlyFinance + monthlyEnergy + monthlyInsurance + monthlyServicing + monthlyVed;
}

// ── Scoring dimensions ────────────────────────────────────────────────────────

function scoreBudget(
  ev: EVModel,
  c: ConsultationFormState,
): { score: number; reason: string | null; tradeoff: string | null } {
  const max = c.budget_max_gbp;
  if (!max) return { score: 15, reason: "No budget limit set — scored neutrally.", tradeoff: null };

  const ratio = ev.price / max;

  // Hard reject: more than 10% over budget
  if (ratio > 1.10) {
    return { score: 0, reason: null, tradeoff: `At £${ev.price.toLocaleString()}, it exceeds your £${max.toLocaleString()} budget.` };
  }

  // Slightly over budget (0–10%)
  if (ratio > 1.0) {
    const pct = Math.round((ratio - 1) * 100);
    return {
      score: 8,
      reason: `Priced £${(ev.price - max).toLocaleString()} above your budget — a small stretch.`,
      tradeoff: `${pct}% above your stated maximum budget.`,
    };
  }

  // Well inside budget
  const headroom = max - ev.price;
  if (ratio <= 0.75) return { score: 25, reason: `Priced at £${ev.price.toLocaleString()} — well within your £${max.toLocaleString()} budget.`, tradeoff: null };
  if (ratio <= 0.90) return { score: 22, reason: `At £${ev.price.toLocaleString()}, it fits comfortably in your budget.`, tradeoff: null };
  return {
    score: 18,
    reason: `Priced at £${ev.price.toLocaleString()} — fits your budget with £${headroom.toLocaleString()} to spare.`,
    tradeoff: null,
  };
}

function scoreBodyType(
  ev: EVModel,
  c: ConsultationFormState,
): { score: number; reason: string | null } {
  const pref = normaliseBodyPref(c.body_type_preference);
  if (!pref) return { score: 15, reason: null }; // No preference → full score

  const actual = getBodyType(ev);
  if (actual === pref) return { score: 15, reason: `${pref.charAt(0).toUpperCase() + pref.slice(1)} body style matches your preference.` };

  // Close enough (e.g. suv ↔ estate)
  const nearMatch: Record<string, string[]> = {
    suv:      ["estate", "mpv"],
    estate:   ["suv", "mpv"],
    hatchback:["city"],
    saloon:   ["hatchback"],
  };
  if (nearMatch[pref]?.includes(actual)) return { score: 9, reason: null };

  return { score: 3, reason: null };
}

function scoreRange(
  ev: EVModel,
  c: ConsultationFormState,
): { score: number; reason: string | null; tradeoff: string | null } {
  const dailyMiles = c.daily_miles;
  if (!dailyMiles || dailyMiles <= 0) {
    // No mileage data — score by absolute range quality
    const rangeMiles = Math.round(ev.rangeKm * 0.621371);
    if (rangeMiles >= 280) return { score: 18, reason: `${rangeMiles}mi real-world range covers most UK driving patterns.`, tradeoff: null };
    if (rangeMiles >= 200) return { score: 13, reason: `${rangeMiles}mi range suits moderate daily use.`, tradeoff: null };
    return { score: 8, reason: null, tradeoff: `Shorter range of ${rangeMiles}mi — check it suits your needs.` };
  }

  const wltpMiles     = Math.round(ev.rangeKm * 0.621371);
  const realMiles     = Math.round(wltpMiles * REAL_WORLD_FACTOR);
  const winterMiles   = Math.round(wltpMiles * 0.70);
  const buffer        = realMiles / dailyMiles;

  if (buffer >= 3.5) return { score: 20, reason: `${realMiles}mi real-world range covers your ${dailyMiles}mi daily drive ${Math.floor(buffer)} times over.`, tradeoff: null };
  if (buffer >= 2.5) return { score: 17, reason: `${realMiles}mi range easily covers your ${dailyMiles}mi daily commute.`, tradeoff: null };
  if (buffer >= 1.5) return { score: 13, reason: `${realMiles}mi range comfortably covers your daily drive.`, tradeoff: null };
  if (buffer >= 1.2) return { score: 9, reason: null, tradeoff: `${realMiles}mi real-world range leaves limited headroom above your ${dailyMiles}mi daily drive.` };

  // Range is tight — check winter
  if (winterMiles >= dailyMiles) {
    return { score: 6, reason: null, tradeoff: `Range is tight in summer and borderline in winter (${winterMiles}mi). Home charging every night is essential.` };
  }
  return { score: 2, reason: null, tradeoff: `${realMiles}mi real-world range may not reliably cover your ${dailyMiles}mi daily drive.` };
}

function scoreCharging(
  ev: EVModel,
  c: ConsultationFormState,
): { score: number; summary: string } {
  const hasHome   = c.home_charging === true;
  const publicOk  = c.public_charging_ok !== false;
  const speedPref = c.charging_speed_importance;
  const hasCCS    = ev.chargingStandard?.toUpperCase().includes("CCS") ?? false;

  let score = 0;
  let summary = "";

  if (hasHome) {
    score += 10;
    summary = "Charges overnight at home — simple and cost-effective.";

    if (speedPref === "high") {
      // Reward high DC kW for users who care about speed
      const dcKw = ev.chargingSpeedDcKw ?? 50;
      if (dcKw >= 150) { score += 5; summary = "Fast home charging + ultra-rapid DC (150kW+) for longer trips."; }
      else if (dcKw >= 100) { score += 4; summary = "Home charging + rapid DC for motorway stops."; }
      else { score += 2; summary = "Home charging available; DC speed is modest."; }
    } else {
      score += 5; // Home charging is reliable regardless of DC speed preference
    }
  } else if (publicOk) {
    if (hasCCS) {
      score  = 13;
      summary = "CCS charging — compatible with virtually all UK public rapid chargers.";
    } else {
      score  = 7;
      summary = "Non-CCS standard; fewer compatible rapid charge points — worth checking your local network.";
    }
  } else {
    // No home charging and uncomfortable with public
    const battKwh = ev.batteryKWh;
    if (battKwh >= 75) { score = 10; summary = `Large ${battKwh}kWh battery extends time between charges — reduces reliance on public networks.`; }
    else if (battKwh >= 55) { score = 6; summary = `${battKwh}kWh battery is workable but you may charge more often without home access.`; }
    else { score = 3; summary = "Smaller battery without home or public charging could be limiting — worth reconsidering."; }
  }

  return { score: Math.min(15, score), summary };
}

function scoreMonthlyCost(
  ev: EVModel,
  monthlyCost: number,
  c: ConsultationFormState,
): { score: number; reason: string | null; tradeoff: string | null } {
  const target = c.target_monthly_payment_gbp;

  if (!target) {
    // No target — score based on absolute cost tier
    if (monthlyCost <= 500) return { score: 13, reason: `Estimated all-in cost of ~£${monthlyCost}/mo is competitive.`, tradeoff: null };
    if (monthlyCost <= 750) return { score: 9, reason: null, tradeoff: null };
    return { score: 6, reason: null, tradeoff: `Higher monthly cost (~£${monthlyCost}/mo) — factor this into your budget.` };
  }

  const ratio = monthlyCost / target;

  if (ratio <= 0.90) return { score: 15, reason: `~£${monthlyCost}/mo estimated cost — below your £${target} monthly target.`, tradeoff: null };
  if (ratio <= 1.00) return { score: 13, reason: `~£${monthlyCost}/mo — comfortably at your £${target} target.`, tradeoff: null };
  if (ratio <= 1.12) return { score: 9, reason: null, tradeoff: `~£${monthlyCost}/mo estimated cost — slightly above your £${target} target.` };
  if (ratio <= 1.25) return { score: 5, reason: null, tradeoff: `~£${monthlyCost}/mo is noticeably above your £${target}/mo target.` };

  return { score: 2, reason: null, tradeoff: `~£${monthlyCost}/mo significantly exceeds your £${target} monthly budget.` };
}

function scoreMotivation(
  ev: EVModel,
  c: ConsultationFormState,
): { score: number; reason: string | null } {
  const motivation = c.main_reason_for_ev;

  switch (motivation) {
    case "save_money": {
      // Reward efficiency (range per £) and lower price
      const annualEnergy = calcAnnualEnergyCost(ev.batteryKWh, ev.rangeKm);
      const rangePerPound = (ev.rangeKm * 0.621) / (ev.price / 1000);
      if (annualEnergy <= 700 && rangePerPound >= 10) return { score: 10, reason: "Efficient and cost-effective — strong value for money." };
      if (annualEnergy <= 900) return { score: 7, reason: "Efficient running costs suit your focus on saving money." };
      return { score: 4, reason: null };
    }

    case "family_use": {
      const familySize = c.family_size ?? 4;
      if (ev.seats >= Math.max(familySize, 5) && ev.bootLitres >= 400)
        return { score: 10, reason: `${ev.seats} seats and ${ev.bootLitres}L boot — practical family space.` };
      if (ev.seats >= familySize)
        return { score: 7, reason: `${ev.seats} seats fits your family of ${familySize}.` };
      return { score: 3, reason: null };
    }

    case "environment": {
      const rangeMiles = ev.rangeKm * 0.621371;
      const efficiency  = rangeMiles / ev.batteryKWh; // mi per kWh
      if (efficiency >= 4.5) return { score: 10, reason: "Excellent efficiency — maximises your environmental benefit." };
      if (efficiency >= 3.5) return { score: 7, reason: "Good efficiency supports your environmental goals." };
      return { score: 4, reason: null };
    }

    case "technology": {
      const isTechBrand = TECH_FORWARD_BRANDS.has(ev.brand);
      const hasQuickAccel = parseAcceleration(ev.acceleration) <= 6.5;
      if (isTechBrand && hasQuickAccel) return { score: 10, reason: `${ev.brand} is known for cutting-edge EV technology and performance.` };
      if (isTechBrand) return { score: 7, reason: `${ev.brand} leads on software and connected features.` };
      return { score: 4, reason: null };
    }

    case "performance": {
      const accel = parseAcceleration(ev.acceleration);
      const kw    = ev.motorCapacityKw;
      if (accel <= 5.0 && kw >= 200) return { score: 10, reason: `0–60 in ~${ev.acceleration} — genuinely quick.` };
      if (accel <= 6.5 || kw >= 150) return { score: 7, reason: `Responsive performance with ${kw}kW motor.` };
      return { score: 3, reason: null };
    }

    case "brand_status": {
      const isPremium = PREMIUM_BRANDS.has(ev.brand);
      if (isPremium) return { score: 10, reason: `${ev.brand} carries strong brand recognition and prestige.` };
      if (ev.tier === "mid" || ev.tier === "premium") return { score: 6, reason: `${ev.brand} has a growing premium reputation in the EV market.` };
      return { score: 3, reason: null };
    }

    default:
      return { score: 5, reason: null };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse "7.3s" → 7.3.  Returns 99 on parse failure. */
function parseAcceleration(accel: string | undefined): number {
  if (!accel) return 99;
  const match = accel.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 99;
}

function buildSavingsSummary(ev: EVModel, annualMiles: number): string {
  // Petrol ICE at £1.52/litre, 35mpg → pence per mile = (100/35) × 152 = 434p/mi
  const petrolCostPerMile = ((100 / 35) * 152) / 100; // pence → GBP
  const petrolAnnual      = Math.round(annualMiles * petrolCostPerMile);

  const publicMix    = 20;
  const evAnnual     = Math.round(calcAnnualEnergyCost(ev.batteryKWh, ev.rangeKm, annualMiles, DEFAULT_ENERGY_RATE_PENCE, publicMix));
  const saving       = petrolAnnual - evAnnual;

  if (saving <= 0) return `Energy costs of ~£${evAnnual}/yr at your mileage.`;
  return `Saves ~£${saving.toLocaleString()}/yr in fuel vs a petrol equivalent (${annualMiles.toLocaleString()}mi/yr).`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Score all candidate EVs against consultation answers and return top 3.
 *
 * @param consultation  Completed ConsultationFormState
 * @param candidates    EV pool (defaults to static evModels)
 */
export function runRecommendationEngine(
  consultation: ConsultationFormState,
  candidates: EVModel[] = evModels,
): RecommendationOutput[] {
  const annualMiles = consultation.yearly_miles ?? 7500;

  const scored: ScoredVehicle[] = candidates
    .map((ev) => {
      const monthly = estimateMonthlyCost(ev, consultation);

      const budget       = scoreBudget(ev, consultation);
      const bodyType     = scoreBodyType(ev, consultation);
      const range        = scoreRange(ev, consultation);
      const charging     = scoreCharging(ev, consultation);
      const monthlyCost  = scoreMonthlyCost(ev, monthly, consultation);
      const motivation   = scoreMotivation(ev, consultation);

      // Hard budget reject
      if (budget.score === 0) return null;

      const breakdown: ScoringBreakdown = {
        budget_fit:        budget.score,
        body_type_fit:     bodyType.score,
        range_fit:         range.score,
        charging_fit:      charging.score,
        monthly_cost_fit:  monthlyCost.score,
        motivation_fit:    motivation.score,
      };

      const totalScore = Math.min(
        100,
        Object.values(breakdown).reduce((a, b) => a + b, 0),
      );

      // Collect reasons (non-null positive signals, max 4)
      const reasons = [
        budget.reason,
        bodyType.reason,
        range.reason,
        charging.summary.length > 0 && charging.score >= 10 ? charging.summary : null,
        monthlyCost.reason,
        motivation.reason,
      ]
        .filter((r): r is string => r !== null && r.length > 0)
        .slice(0, 4);

      // Collect tradeoffs (honest caveats, max 2)
      const tradeoffs = [
        budget.tradeoff,
        range.tradeoff,
        monthlyCost.tradeoff,
      ]
        .filter((t): t is string => t !== null && t.length > 0)
        .slice(0, 2);

      return {
        vehicle: ev,
        totalScore,
        breakdown,
        reasons: reasons.length > 0 ? reasons : [`${ev.brand} ${ev.model} scored well across your key requirements.`],
        tradeoffs,
        estimated_monthly_cost: monthly,
        charging_fit_summary: charging.summary,
        savings_summary: buildSavingsSummary(ev, annualMiles),
      } satisfies ScoredVehicle;
    })
    .filter((v): v is ScoredVehicle => v !== null);

  // Sort descending, take top 3
  const top3 = scored
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 3);

  return top3.map((s, i) => {
    const rank = (i + 1) as 1 | 2 | 3;
    const output: RecommendationOutput = {
      rank,
      vehicle:                 s.vehicle,
      match_score:             s.totalScore,
      breakdown:               s.breakdown,
      reasons:                 s.reasons,
      tradeoffs:               s.tradeoffs,
      estimated_monthly_cost:  s.estimated_monthly_cost,
      charging_fit_summary:    s.charging_fit_summary,
      savings_summary:         s.savings_summary,
    };

    if (rank === 1) {
      output.explanation = buildExplanation(s, consultation);
    }

    return output;
  });
}
