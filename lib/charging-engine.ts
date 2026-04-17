/**
 * lib/charging-engine.ts
 *
 * Charging confidence engine for EV buyers.
 * Combines range confidence, charging fit scoring, and cost estimation
 * into plain-English summaries non-technical buyers can act on.
 *
 * Rules-based, deterministic, zero side effects.
 * Safe to run on server or in browser.
 */

import {
  REAL_WORLD_FACTOR,
  WINTER_FACTOR,
  DEFAULT_ENERGY_RATE_PENCE,
  DEFAULT_PUBLIC_CHARGE_RATE_PENCE,
  estimateOvernightChargeHours,
  acChargingLabel,
  dcChargingLabel,
} from "@/lib/ev-intelligence";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChargingDependency = "low" | "medium" | "high";
export type RangeVerdict = "comfortable" | "caution" | "tight";

export interface ChargingInputs {
  // ── Vehicle ───────────────────────────────────────────────
  batteryKWh:          number;
  rangeKm:             number;
  /** Max AC wallbox charge rate in kW (e.g. 7, 11, 22) */
  chargingSpeedAcKw?:  number;
  /** Max DC rapid charge rate in kW (e.g. 50, 150, 350) */
  chargingSpeedDcKw?:  number;
  /** Minutes to charge from 10% to 80% on DC fast charger */
  chargeTimeTo80Mins?: number;
  /** Primary charge port standard: CCS | CHAdeMO | NACS | Type2 */
  chargingStandard?:   string;

  // ── User ──────────────────────────────────────────────────
  dailyMiles?:        number;
  weeklyMiles?:       number;
  homeCharging?:      boolean;
  publicChargingOk?:  boolean;
}

export interface ChargingOutput {
  // ── Scores ────────────────────────────────────────────────
  /** How confidently the vehicle's range covers the user's daily drive (0–100) */
  rangeConfidenceScore: number;
  /** How well the vehicle's charging setup fits the user's situation (0–100) */
  chargingFitScore: number;

  // ── Frequency ─────────────────────────────────────────────
  estimatedChargesPerWeek:  number;
  estimatedChargesPerMonth: number;

  // ── Cost ──────────────────────────────────────────────────
  weeklyChargeCostGbp:  number;
  monthlyChargeCostGbp: number;

  // ── Plain-English summaries ───────────────────────────────
  homeChargingSummary:            string;
  publicChargingDependency:       ChargingDependency;
  publicChargingDependencySummary: string;
  chargingTimeSummary:            string;
  chargeCostSummary:              string;
  rangeVerdict:                   RangeVerdict;
  rangeVerdictText:               string;

  // ── Range details ─────────────────────────────────────────
  realWorldRangeMiles: number;
  winterRangeMiles:    number;
  wltpMiles:           number;

  // ── Charge time ───────────────────────────────────────────
  /** Estimated hours to fully charge on AC wallbox */
  overnightChargeHours: number | null;
  /** Human-readable time-to-80% label */
  chargeTimeTo80Label: string | null;

  // ── Actionable recommendations ───────────────────────────
  recommendations: string[];
}

// ── Main export ───────────────────────────────────────────────────────────────

export function runChargingEngine(inputs: ChargingInputs): ChargingOutput {
  const {
    batteryKWh,
    rangeKm,
    chargingSpeedAcKw,
    chargingSpeedDcKw,
    chargeTimeTo80Mins,
    chargingStandard,
    dailyMiles,
    homeCharging,
    publicChargingOk,
  } = inputs;

  // ── Range ─────────────────────────────────────────────────────────────────

  const wltpMiles          = Math.round(rangeKm * 0.621371);
  const realWorldRangeMiles = Math.round(wltpMiles * REAL_WORLD_FACTOR);
  const winterRangeMiles   = Math.round(wltpMiles * WINTER_FACTOR);

  // UK average daily round-trip: ~30 mi
  const effectiveDailyMiles  = (dailyMiles && dailyMiles > 0) ? dailyMiles : 30;

  const rangeRatio = realWorldRangeMiles / effectiveDailyMiles;

  // ── Range confidence score (0–100) ────────────────────────────────────────

  let rangeConfidenceScore: number;
  let rangeVerdict: RangeVerdict;
  let rangeVerdictText: string;

  if (rangeRatio >= 4) {
    rangeConfidenceScore = 100;
    rangeVerdict         = "comfortable";
    rangeVerdictText     =
      `${realWorldRangeMiles} mi real-world range covers your ${effectiveDailyMiles} mi ` +
      `daily drive ${Math.floor(rangeRatio)}× over — you'd rarely need to think about charging.`;
  } else if (rangeRatio >= 2.5) {
    rangeConfidenceScore = Math.round(70 + ((rangeRatio - 2.5) / 1.5) * 30);
    rangeVerdict         = "comfortable";
    rangeVerdictText     =
      `${realWorldRangeMiles} mi of real-world range fits your daily drive with plenty of ` +
      `headroom for detours and longer days.`;
  } else if (rangeRatio >= 1.5) {
    rangeConfidenceScore = Math.round(50 + (rangeRatio - 1.5) * 20);
    rangeVerdict         = "comfortable";
    rangeVerdictText     =
      `Range covers your ${effectiveDailyMiles} mi commute comfortably. Overnight home ` +
      `charging (or a top-up 2–3×/week) keeps you stress-free.`;
  } else if (rangeRatio >= 1.2) {
    rangeConfidenceScore = Math.round(35 + ((rangeRatio - 1.2) / 0.3) * 15);
    rangeVerdict         = "caution";
    rangeVerdictText     =
      `Range fits your typical day, but winter conditions (${winterRangeMiles} mi) bring it ` +
      `closer to the limit. Plan to charge every night.`;
  } else if (rangeRatio >= 1.0) {
    rangeConfidenceScore = 30;
    rangeVerdict         = "caution";
    rangeVerdictText     =
      `Workable for your ${effectiveDailyMiles} mi daily drive, but with little margin. ` +
      `Charging overnight is essential — missing a session creates range anxiety.`;
  } else {
    rangeConfidenceScore = Math.max(5, Math.round(rangeRatio * 30));
    rangeVerdict         = "tight";
    rangeVerdictText     =
      `Real-world range (${realWorldRangeMiles} mi) may not fully cover your ` +
      `${effectiveDailyMiles} mi daily drive. Consider a longer-range model or plan mid-day top-ups.`;
  }

  rangeConfidenceScore = Math.min(100, Math.max(0, rangeConfidenceScore));

  // ── Charging frequency ────────────────────────────────────────────────────

  const daysPerCharge = realWorldRangeMiles > 0
    ? Math.max(1, Math.floor(realWorldRangeMiles / effectiveDailyMiles))
    : 7;
  const estimatedChargesPerWeek  = Math.max(1, Math.ceil(7 / daysPerCharge));
  const estimatedChargesPerMonth = Math.ceil(estimatedChargesPerWeek * 4.33);

  // ── Charging cost ─────────────────────────────────────────────────────────

  const homeRateGbp   = DEFAULT_ENERGY_RATE_PENCE / 100;
  const publicRateGbp = DEFAULT_PUBLIC_CHARGE_RATE_PENCE / 100;

  const fullChargeCostHome   = Math.round(batteryKWh * homeRateGbp * 100) / 100;
  const fullChargeCostPublic = Math.round(batteryKWh * publicRateGbp * 100) / 100;

  // Blend based on home charging availability
  const publicShare = homeCharging === true ? 0.15
    : homeCharging === false ? 0.70
    : 0.30;
  const homeShare = 1 - publicShare;

  const avgChargeCostGbp =
    fullChargeCostHome * homeShare + fullChargeCostPublic * publicShare;

  const weeklyChargeCostGbp  =
    Math.round(avgChargeCostGbp * estimatedChargesPerWeek * 100) / 100;
  const monthlyChargeCostGbp =
    Math.round(weeklyChargeCostGbp * 4.33 * 100) / 100;

  // ── Charge time ───────────────────────────────────────────────────────────

  const acKw               = chargingSpeedAcKw ?? 7;
  const overnightChargeHours = estimateOvernightChargeHours(batteryKWh, acKw);
  const acLabel            = acChargingLabel(acKw);

  let chargingTimeSummary: string;
  if (chargeTimeTo80Mins && chargingSpeedDcKw) {
    chargingTimeSummary =
      `${overnightChargeHours}h overnight on a ${acLabel}. ` +
      `${chargeTimeTo80Mins} min to 80% on a ${dcChargingLabel(chargingSpeedDcKw)} public charger.`;
  } else if (chargingSpeedDcKw) {
    const roughDcMins =
      Math.round((batteryKWh * 0.7 / chargingSpeedDcKw) * 60);
    chargingTimeSummary =
      `${overnightChargeHours}h overnight on a ${acLabel}. ` +
      `~${roughDcMins} min to 80% on a ${dcChargingLabel(chargingSpeedDcKw)} charger (estimated).`;
  } else {
    chargingTimeSummary =
      `${overnightChargeHours}h overnight on a ${acLabel}. ` +
      `DC rapid charging capability not specified.`;
  }

  // ── Charge cost summary ───────────────────────────────────────────────────

  const chargeCostSummary = homeCharging
    ? `Full home charge costs ~£${fullChargeCostHome.toFixed(2)} at 28p/kWh. ` +
      `At ~${estimatedChargesPerWeek}×/week, budget ~£${weeklyChargeCostGbp.toFixed(2)}/week.`
    : `Relying on public charging at 65p/kWh costs ~£${fullChargeCostPublic.toFixed(2)}/charge. ` +
      `Budget ~£${monthlyChargeCostGbp.toFixed(0)}/month for electricity.`;

  // ── Home charging summary ─────────────────────────────────────────────────

  let homeChargingSummary: string;
  if (homeCharging === true) {
    homeChargingSummary =
      `With a home wallbox (${acLabel}), you'll start every day with a full battery. ` +
      `This is the most convenient and cheapest way to own an EV.`;
  } else if (homeCharging === false && publicChargingOk === true) {
    homeChargingSummary =
      `Without home charging, you'll rely on public networks. ` +
      `Plan regular rapid-charge stops — and check charger availability near your usual routes.`;
  } else if (homeCharging === false) {
    homeChargingSummary =
      `No home charging makes EV ownership more dependent on public infrastructure. ` +
      `A reliable rapid charge network in your area is essential.`;
  } else {
    homeChargingSummary =
      `Home charging typically cuts your energy costs by over 50% vs public charging ` +
      `and means you start every day with a full battery.`;
  }

  // ── Public charging dependency ────────────────────────────────────────────

  let publicChargingDependency: ChargingDependency;
  let publicChargingDependencySummary: string;

  if (homeCharging === true && rangeRatio >= 2.5) {
    publicChargingDependency        = "low";
    publicChargingDependencySummary =
      "You'll rarely need public charging — home charging covers the vast majority of your journeys.";
  } else if (homeCharging === true) {
    publicChargingDependency        = "low";
    publicChargingDependencySummary =
      "Home charging covers most trips. Public chargers are useful for longer journeys, not day-to-day.";
  } else if (homeCharging === false && publicChargingOk === true) {
    publicChargingDependency        = "high";
    publicChargingDependencySummary =
      "You'll rely primarily on public charging. Look for rapid chargers (50 kW+) near home, work, and regular routes.";
  } else {
    publicChargingDependency        = "medium";
    publicChargingDependencySummary =
      "Public charging will supplement home sessions for longer trips. Aim to use rapid chargers (50 kW+) when out.";
  }

  // ── CCS compatibility (UK standard) ──────────────────────────────────────

  const hasCCS = chargingStandard
    ? chargingStandard.toUpperCase().includes("CCS")
    : true; // assume CCS unless specified otherwise

  // ── Charging fit score (0–100) ────────────────────────────────────────────

  let chargingFitScore = 50;

  if (homeCharging === true)                              chargingFitScore += 30;
  if (publicChargingOk === true)                          chargingFitScore += 10;
  if (chargingSpeedDcKw && chargingSpeedDcKw >= 100)     chargingFitScore += 10;
  if (hasCCS)                                            chargingFitScore +=  5;
  if (publicChargingDependency === "high")               chargingFitScore -= 15;
  if (rangeVerdict === "tight")                          chargingFitScore -= 10;
  if (rangeVerdict === "caution")                        chargingFitScore -=  5;

  chargingFitScore = Math.min(100, Math.max(0, chargingFitScore));

  // ── Actionable recommendations ────────────────────────────────────────────

  const recommendations: string[] = [];

  if (!homeCharging) {
    recommendations.push(
      "Consider installing a home wallbox (£800–£1,200 installed). It cuts your charging costs by up to 60% and charges overnight while you sleep.",
    );
  }

  if (rangeVerdict === "tight") {
    recommendations.push(
      "Your daily mileage is close to this EV's real-world range. A larger-battery model would give significantly more peace of mind.",
    );
  }

  if (rangeVerdict === "caution") {
    recommendations.push(
      "Overnight charging is essential with your daily mileage. Set a charging schedule to top up every night.",
    );
  }

  if (chargingSpeedDcKw && chargingSpeedDcKw < 50) {
    recommendations.push(
      `This vehicle's DC charging rate (${chargingSpeedDcKw} kW) is relatively slow. Rapid top-ups on longer trips will take noticeably longer than most newer EVs.`,
    );
  }

  if (!hasCCS) {
    recommendations.push(
      "This vehicle uses a non-CCS port. Check that public chargers on your regular routes support this connector type.",
    );
  }

  if (homeCharging && chargingSpeedAcKw && chargingSpeedAcKw < 7) {
    recommendations.push(
      "A standard 3-pin socket charges slowly (~12+ hours for a full charge). A dedicated 7 kW wallbox is strongly recommended.",
    );
  }

  // ── Charge time to 80% label ──────────────────────────────────────────────

  let chargeTimeTo80Label: string | null = null;
  if (chargeTimeTo80Mins) {
    chargeTimeTo80Label = `${chargeTimeTo80Mins} min to 80%`;
  } else if (chargingSpeedDcKw) {
    const roughMins = Math.round((batteryKWh * 0.7 / chargingSpeedDcKw) * 60);
    chargeTimeTo80Label = `~${roughMins} min to 80% (est.)`;
  }

  return {
    rangeConfidenceScore,
    chargingFitScore,
    estimatedChargesPerWeek,
    estimatedChargesPerMonth,
    weeklyChargeCostGbp,
    monthlyChargeCostGbp,
    homeChargingSummary,
    publicChargingDependency,
    publicChargingDependencySummary,
    chargingTimeSummary,
    chargeCostSummary,
    rangeVerdict,
    rangeVerdictText,
    realWorldRangeMiles,
    winterRangeMiles,
    wltpMiles,
    overnightChargeHours,
    chargeTimeTo80Label,
    recommendations,
  };
}
