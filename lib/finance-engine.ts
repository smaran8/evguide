/**
 * lib/finance-engine.ts
 *
 * Finance intelligence engine for EV affordability assessment.
 * Produces plain-English guided output — not just numbers.
 *
 * Rules-based, deterministic, zero side effects.
 * Safe to run on server or in browser.
 * All monetary values in GBP.
 */

import {
  calcAnnualEnergyCost,
  DEFAULT_ENERGY_RATE_PENCE,
} from "@/lib/ev-intelligence";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_APR          = 9.9;
const DEFAULT_TERM_MONTHS  = 48;
const DEFAULT_DEPOSIT_PCT  = 0.10;

/**
 * Conservative max monthly EV spend by income band.
 * Based on ~25% of estimated net monthly take-home.
 */
const INCOME_MAX_MONTHLY: Record<IncomeBand, number> = {
  under_25k:         320,
  "25k_40k":         520,
  "40k_60k":         780,
  "60k_plus":       1150,
  prefer_not_to_say: 580,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type IncomeBand =
  | "under_25k"
  | "25k_40k"
  | "40k_60k"
  | "60k_plus"
  | "prefer_not_to_say";

/** How comfortably this EV fits within the buyer's overall budget */
export type AffordabilityBand =
  | "comfortable"   // total monthly ≤ 80% of budget
  | "manageable"    // 80–95%
  | "stretch"       // 95–110%
  | "over_budget";  // >110%

/** High-level signal used to drive UI call-to-action copy */
export type FinanceFitStatus =
  | "finance_ready"      // deposit ≥10%, affordable
  | "budget_tight"       // affordable but close to limit
  | "deposit_needed"     // deposit <10%
  | "not_recommended";   // over budget or very low deposit

export interface FinanceInputs {
  /** OTR vehicle price in £ */
  vehiclePrice: number;
  /** Deposit the buyer can put down (defaults to 10% suggestion) */
  depositGbp?: number;
  /** Finance term in months (default 48) */
  termMonths?: number;
  /** Annual Percentage Rate % (default 9.9) */
  aprPct?: number;
  /** Rough income band for affordability context */
  incomeBand?: IncomeBand;
  /** User's stated max monthly budget for total ownership costs */
  targetMonthlyGbp?: number;
  /** Annual mileage in miles (default 7 500) */
  annualMiles?: number;
  /** Vehicle battery capacity in kWh — required for energy cost */
  batteryKWh?: number;
  /** Vehicle WLTP range in km — required for energy cost */
  rangeKm?: number;
  /** Whether the buyer has home charging (affects public charge mix) */
  homeCharging?: boolean;
}

export interface FinanceBreakdown {
  /** Monthly EMI/loan payment */
  emiGbp: number;
  /** Estimated monthly electricity/charging cost */
  chargingMonthlyGbp: number;
  /** Estimated monthly insurance (price-banded) */
  insuranceMonthlyGbp: number;
  /** Estimated monthly servicing (EV-optimised) */
  servicingMonthlyGbp: number;
  /** Monthly VED (£0 under £40 k, £190/yr over) */
  vedMonthlyGbp: number;
}

export interface FinanceOutput {
  // ── Inputs echoed ────────────────────────────────────────────────────────
  vehiclePrice:   number;
  depositUsed:    number;
  termMonths:     number;
  aprPct:         number;

  // ── EMI & repayment ──────────────────────────────────────────────────────
  estimatedEmi:      number;
  breakdown:         FinanceBreakdown;
  /** Sum of all monthly costs (EMI + running) */
  totalEstimatedMonthlyCost: number;
  totalInterestGbp:  number;
  totalRepayableGbp: number;

  // ── Deposit intelligence ─────────────────────────────────────────────────
  /** Suggested 10% deposit */
  suggestedDepositGbp: number;
  /** Actual deposit as a percentage of vehicle price */
  depositAsPercent: number;
  /** How much more deposit would hit the 10% target (0 if already there) */
  depositGap: number;

  // ── Affordability ────────────────────────────────────────────────────────
  affordabilityBand:    AffordabilityBand;
  affordabilitySummary: string;
  /** Remaining monthly budget after all EV costs (null if no budget given) */
  monthlyHeadroom: number | null;

  // ── Finance-ready signal ─────────────────────────────────────────────────
  financeFitStatus:    FinanceFitStatus;
  /** Positive signals (displayed as green ticks) */
  financeReadySignals: string[];
  /** Caution notes (displayed as amber alerts) */
  financeWarnings:     string[];

  // ── Efficiency ───────────────────────────────────────────────────────────
  /** Cost per mile in pence (null if no vehicle efficiency data) */
  costPerMilePence: number | null;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function runFinanceEngine(inputs: FinanceInputs): FinanceOutput {
  const {
    vehiclePrice,
    depositGbp,
    termMonths  = DEFAULT_TERM_MONTHS,
    aprPct      = DEFAULT_APR,
    incomeBand,
    targetMonthlyGbp,
    annualMiles = 7_500,
    batteryKWh,
    rangeKm,
    homeCharging,
  } = inputs;

  // ── Deposit ──────────────────────────────────────────────────────────────

  const suggestedDepositGbp = Math.round(vehiclePrice * DEFAULT_DEPOSIT_PCT);
  const depositUsed         = depositGbp ?? suggestedDepositGbp;
  const depositAsPercent    = Math.round((depositUsed / vehiclePrice) * 100);
  const depositGap          = Math.max(0, suggestedDepositGbp - depositUsed);

  // ── EMI (reducing-balance / PCP formula) ─────────────────────────────────

  const principal  = Math.max(0, vehiclePrice - depositUsed);
  const monthlyRate = aprPct / 100 / 12;

  let estimatedEmi = 0;
  if (principal > 0) {
    if (monthlyRate === 0) {
      estimatedEmi = Math.round(principal / termMonths);
    } else {
      estimatedEmi = Math.round(
        (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1),
      );
    }
  }

  const totalRepayableGbp = Math.round(depositUsed + estimatedEmi * termMonths);
  const totalInterestGbp  = Math.max(0, totalRepayableGbp - vehiclePrice);

  // ── Running costs ─────────────────────────────────────────────────────────

  // Energy / charging
  let chargingMonthlyGbp = 0;
  let costPerMilePence: number | null = null;

  if (batteryKWh && rangeKm && batteryKWh > 0 && rangeKm > 0) {
    const publicMixPct  = homeCharging === false ? 60 : 15;
    const annualEnergy  = calcAnnualEnergyCost(
      batteryKWh, rangeKm, annualMiles, DEFAULT_ENERGY_RATE_PENCE, publicMixPct,
    );
    chargingMonthlyGbp  = Math.round((annualEnergy / 12) * 100) / 100;

    const rangeMiles        = rangeKm * 0.621371;
    const efficiencyMiPerKwh = rangeMiles / batteryKWh;
    const kwhPer100Miles    = 100 / efficiencyMiPerKwh;
    costPerMilePence        = Math.round(kwhPer100Miles * DEFAULT_ENERGY_RATE_PENCE) / 100;
  }

  // Insurance (price-banded UK estimate)
  const annualInsuranceGbp   =
    vehiclePrice < 30_000 ? 650 :
    vehiclePrice < 45_000 ? 800 : 1_050;
  const insuranceMonthlyGbp  = Math.round((annualInsuranceGbp / 12) * 100) / 100;

  // Servicing (EVs are cheaper — no oil changes, simpler brakes)
  const servicingMonthlyGbp  = Math.round((180 / 12) * 100) / 100; // £180/yr → £15/mo

  // VED: free under £40 k, expensive-car supplement above
  const vedMonthlyGbp        =
    vehiclePrice > 40_000 ? Math.round((190 / 12) * 100) / 100 : 0;

  const breakdown: FinanceBreakdown = {
    emiGbp:              estimatedEmi,
    chargingMonthlyGbp,
    insuranceMonthlyGbp,
    servicingMonthlyGbp,
    vedMonthlyGbp,
  };

  const totalEstimatedMonthlyCost = Math.round(
    estimatedEmi + chargingMonthlyGbp + insuranceMonthlyGbp +
    servicingMonthlyGbp + vedMonthlyGbp,
  );

  // ── Affordability band ────────────────────────────────────────────────────

  const effectiveBudget =
    targetMonthlyGbp ??
    (incomeBand ? INCOME_MAX_MONTHLY[incomeBand] : null);

  let affordabilityBand: AffordabilityBand = "manageable";
  let monthlyHeadroom: number | null = null;
  let affordabilitySummary: string;

  if (effectiveBudget) {
    monthlyHeadroom   = Math.round(effectiveBudget - totalEstimatedMonthlyCost);
    const ratio       = totalEstimatedMonthlyCost / effectiveBudget;

    if      (ratio <= 0.80) affordabilityBand = "comfortable";
    else if (ratio <= 0.95) affordabilityBand = "manageable";
    else if (ratio <= 1.10) affordabilityBand = "stretch";
    else                    affordabilityBand = "over_budget";

    affordabilitySummary = buildAffordabilitySummary(
      affordabilityBand, totalEstimatedMonthlyCost, effectiveBudget, monthlyHeadroom,
    );
  } else {
    affordabilitySummary =
      `Estimated all-in monthly cost is £${totalEstimatedMonthlyCost}. ` +
      `Enter your monthly budget above to see how it fits.`;
  }

  // ── Finance-ready signal ──────────────────────────────────────────────────

  const { financeFitStatus, financeReadySignals, financeWarnings } =
    assessFinanceFit({
      depositUsed,
      suggestedDepositGbp,
      depositAsPercent,
      totalEstimatedMonthlyCost,
      effectiveBudget,
      affordabilityBand,
      vehiclePrice,
    });

  return {
    vehiclePrice,
    depositUsed,
    termMonths,
    aprPct,
    estimatedEmi,
    breakdown,
    totalEstimatedMonthlyCost,
    totalInterestGbp,
    totalRepayableGbp,
    suggestedDepositGbp,
    depositAsPercent,
    depositGap,
    affordabilityBand,
    affordabilitySummary,
    monthlyHeadroom,
    financeFitStatus,
    financeReadySignals,
    financeWarnings,
    costPerMilePence,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAffordabilitySummary(
  band: AffordabilityBand,
  monthly: number,
  budget: number,
  headroom: number,
): string {
  const fmt = (n: number) => `£${Math.abs(n).toLocaleString()}`;
  switch (band) {
    case "comfortable":
      return `At ${fmt(monthly)}/month all-in, this EV fits comfortably within your ${fmt(budget)} budget — leaving ${fmt(headroom)} of breathing room each month.`;
    case "manageable":
      return `${fmt(monthly)}/month is close to your ${fmt(budget)} budget but workable. Keep some flexibility for unexpected costs.`;
    case "stretch":
      return `${fmt(monthly)}/month is slightly above your ${fmt(budget)} target. Achievable, but you'd need to review other outgoings first.`;
    case "over_budget":
      return `${fmt(monthly)}/month exceeds your ${fmt(budget)} budget by ${fmt(Math.abs(headroom))}. A larger deposit, longer term, or lower-priced model would bring costs down.`;
  }
}

function assessFinanceFit(params: {
  depositUsed:             number;
  suggestedDepositGbp:     number;
  depositAsPercent:        number;
  totalEstimatedMonthlyCost: number;
  effectiveBudget:         number | null;
  affordabilityBand:       AffordabilityBand;
  vehiclePrice:            number;
}): {
  financeFitStatus:    FinanceFitStatus;
  financeReadySignals: string[];
  financeWarnings:     string[];
} {
  const signals: string[] = [];
  const warnings: string[] = [];

  // Deposit quality
  if (params.depositAsPercent >= 20) {
    signals.push(
      `Strong deposit (${params.depositAsPercent}%) — improves approval odds and reduces monthly payments.`,
    );
  } else if (params.depositAsPercent >= 10) {
    signals.push(
      `Deposit meets the typical 10% minimum required by most UK lenders.`,
    );
  } else {
    warnings.push(
      `Low deposit (${params.depositAsPercent}%). Most lenders require at least 10% — consider saving £${params.suggestedDepositGbp.toLocaleString()} before applying.`,
    );
  }

  // Affordability
  if (params.affordabilityBand === "comfortable") {
    signals.push("Monthly cost is well within your budget — a strong indicator of finance approval.");
  } else if (params.affordabilityBand === "manageable") {
    signals.push("Monthly costs are within range, though close to your budget limit.");
  } else if (params.affordabilityBand === "stretch") {
    warnings.push(
      "Monthly costs stretch your budget slightly. Lenders typically want total commitments under 40% of take-home pay.",
    );
  } else if (params.affordabilityBand === "over_budget") {
    warnings.push(
      "Monthly costs exceed your budget. A larger deposit or longer term would lower your monthly payment.",
    );
  }

  // VED expensive-car supplement
  if (params.vehiclePrice > 40_000) {
    warnings.push(
      "This EV is over £40,000 — the £190/yr expensive car VED supplement applies from year two.",
    );
  } else {
    signals.push("Priced under £40,000 — no VED expensive-car supplement applies.");
  }

  // Finance-ready status
  let financeFitStatus: FinanceFitStatus;
  if (params.depositAsPercent < 10) {
    financeFitStatus = "deposit_needed";
  } else if (params.affordabilityBand === "over_budget") {
    financeFitStatus = "not_recommended";
  } else if (params.affordabilityBand === "stretch") {
    financeFitStatus = "budget_tight";
  } else {
    financeFitStatus = "finance_ready";
  }

  return { financeFitStatus, financeReadySignals: signals, financeWarnings: warnings };
}
