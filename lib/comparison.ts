/**
 * EV Comparison Metrics
 *
 * Defines the 8 EV-native metrics shown in the side-by-side comparison table,
 * plus a utility to determine which vehicle "wins" each metric row.
 */

import type { EVModel } from "@/types";
import { calcTCO } from "@/lib/ev-intelligence";
import { applyEvEnrichment } from "@/data/evEnrichment";

export interface CompareMetric {
  key: string;
  label: string;
  unit: string;
  getValue: (v: EVModel) => number | null;
  lowerIsBetter: boolean;
  format: (n: number) => string;
}

/** Format a number as a UK price string e.g. £32,495 */
function fmtPrice(n: number): string {
  return "£" + Math.round(n).toLocaleString("en-GB");
}

export const COMPARE_METRICS: CompareMetric[] = [
  {
    key: "price",
    label: "Purchase Price",
    unit: "£",
    getValue: (v) => (v.price != null ? v.price : null),
    lowerIsBetter: true,
    format: fmtPrice,
  },
  {
    key: "realWorldRangeMiles",
    label: "Real-World Range",
    unit: "mi",
    getValue: (v) => {
      const enriched = applyEvEnrichment(v);
      return enriched.realWorldRangeMiles ?? null;
    },
    lowerIsBetter: false,
    format: (n) => `${Math.round(n)} mi`,
  },
  {
    key: "chargingSpeedDcKw",
    label: "DC Rapid Charging",
    unit: "kW",
    getValue: (v) => {
      const enriched = applyEvEnrichment(v);
      return enriched.chargingSpeedDcKw ?? null;
    },
    lowerIsBetter: false,
    format: (n) => `${Math.round(n)} kW`,
  },
  {
    key: "chargingSpeedAcKw",
    label: "AC Home Charging",
    unit: "kW",
    getValue: (v) => {
      const enriched = applyEvEnrichment(v);
      return enriched.chargingSpeedAcKw ?? null;
    },
    lowerIsBetter: false,
    format: (n) => `${n} kW`,
  },
  {
    key: "chargeTimeTo80",
    label: "10–80% charge time",
    unit: "min",
    getValue: (v) => {
      const enriched = applyEvEnrichment(v);
      return enriched.chargeTimeTo80Mins ?? null;
    },
    lowerIsBetter: true,
    format: (n) => `${n} min`,
  },
  {
    key: "bootLitres",
    label: "Boot Space",
    unit: "L",
    getValue: (v) => (v.bootLitres != null ? v.bootLitres : null),
    lowerIsBetter: false,
    format: (n) => `${n} L`,
  },
  {
    key: "warrantyYears",
    label: "Warranty",
    unit: "yrs",
    getValue: (v) => {
      if (!v.warranty) return null;
      const parsed = Number.parseFloat(String(v.warranty).replace(/[^0-9.]/g, ""));
      return Number.isFinite(parsed) ? Math.round(parsed) : null;
    },
    lowerIsBetter: false,
    format: (n) => `${n} yrs`,
  },
  {
    key: "batteryWarrantyYears",
    label: "Battery warranty",
    unit: "yrs",
    getValue: (v) => (v.batteryWarrantyYears ?? null),
    lowerIsBetter: false,
    format: (n) => `${n} yrs`,
  },
  {
    key: "bikTax",
    label: "BIK tax estimate",
    unit: "£/mo",
    getValue: (v) => (v.price ? Math.round((v.price * 0.015) / 12) : null),
    lowerIsBetter: true,
    format: (n) => `£${n}/mo`,
  },
  {
    key: "greatDealScore",
    label: "Great Deal Score",
    unit: "",
    getValue: (v) => {
      const base = v.rangeKm / Math.max(v.price, 1) * 1000;
      const bonus = (v.batteryKWh ?? 0) / 2;
      return Math.round(base + bonus);
    },
    lowerIsBetter: false,
    format: (n) => `${n}`,
  },
  {
    key: "annualEnergyCostGbp",
    label: "Annual Energy Cost",
    unit: "£/yr",
    getValue: (v) => {
      const enriched = applyEvEnrichment(v);
      return enriched.annualEnergyCostGbp ?? null;
    },
    lowerIsBetter: true,
    format: (n) => `£${Math.round(n)}/yr`,
  },
  {
    key: "fiveYearTco",
    label: "5-Year TCO",
    unit: "£",
    getValue: (v) => {
      if (v.price == null) return null;
      const tco = calcTCO({
        vehiclePrice: v.price,
        batteryKWh: v.batteryKWh ?? 60,
        rangeKm: v.rangeKm ?? 400,
        annualMiles: 7500,
        energyRatePence: 28,
        publicChargeMixPct: 20,
      });
      // calcTCO returns a 3-year total; derive 5-year by scaling running costs
      // Running costs = total3YrCostGbp − vehiclePrice (purchase is a one-off)
      // 5-yr total = vehiclePrice + (running costs per year × 5)
      const annualRunning = (tco.total3YrCostGbp - v.price) / 3;
      return Math.round(v.price + annualRunning * 5);
    },
    lowerIsBetter: true,
    format: fmtPrice,
  },
  {
    key: "acceleration",
    label: "0–100 km/h",
    unit: "s",
    getValue: (v) => {
      if (!v.acceleration) return null;
      // acceleration field is a string like "6.5s" or "6.5"
      const parsed = parseFloat(v.acceleration);
      return isNaN(parsed) ? null : parsed;
    },
    lowerIsBetter: true,
    format: (n) => `${n.toFixed(1)}s`,
  },
  {
    key: "batteryKWh",
    label: "Battery Size",
    unit: "kWh",
    getValue: (v) => (v.batteryKWh != null ? v.batteryKWh : null),
    lowerIsBetter: false,
    format: (n) => `${n} kWh`,
  },
];

/**
 * Returns the index (0-based) of the winning vehicle for a given metric.
 * Returns -1 if there is a tie or if no vehicle has data for this metric.
 */
export function getWinnerIndex(vehicles: EVModel[], metric: CompareMetric): number {
  const values = vehicles.map((v) => metric.getValue(v));

  // Need at least one non-null value
  const nonNullValues = values.filter((v): v is number => v !== null);
  if (nonNullValues.length === 0) return -1;

  // Find the best value
  const best = metric.lowerIsBetter
    ? Math.min(...nonNullValues)
    : Math.max(...nonNullValues);

  // Find which vehicles have the best value
  const winners = values.reduce<number[]>((acc, v, i) => {
    if (v !== null && v === best) acc.push(i);
    return acc;
  }, []);

  // Tie — no single winner
  if (winners.length !== 1) return -1;

  return winners[0];
}
