/**
 * lib/recommendation-engine/explanation.ts
 *
 * Generates a plain-language, 2–4 sentence explanation for the top match.
 * Deterministic — no LLM involved. Combines template sentences keyed to
 * the highest-scoring dimensions and the user's stated motivation.
 */

import { REAL_WORLD_FACTOR } from "@/lib/ev-intelligence";
import type { ConsultationFormState } from "@/types/consultation";
import type { ScoredVehicle } from "./types";

export function buildExplanation(
  top: ScoredVehicle,
  consultation: ConsultationFormState,
): string {
  const ev = top.vehicle;
  const bd = top.breakdown;

  const sentences: string[] = [];

  // ── Opening: budget or motivation ────────────────────────────────────────

  if (bd.budget_fit >= 20 && consultation.budget_max_gbp) {
    sentences.push(
      `The ${ev.brand} ${ev.model} fits comfortably within your £${consultation.budget_max_gbp.toLocaleString()} budget at £${ev.price.toLocaleString()}.`,
    );
  } else if (consultation.main_reason_for_ev === "save_money") {
    sentences.push(
      `For a buyer focused on running costs, the ${ev.brand} ${ev.model} is one of the more efficient options at this price point.`,
    );
  } else if (consultation.main_reason_for_ev === "family_use") {
    sentences.push(
      `With ${ev.seats} seats and ${ev.bootLitres}L of boot space, the ${ev.brand} ${ev.model} is built for family life.`,
    );
  } else if (consultation.main_reason_for_ev === "performance") {
    sentences.push(
      `If performance is your priority, the ${ev.brand} ${ev.model}'s ${ev.motorCapacityKw}kW motor and ${ev.acceleration} 0–60 stand out.`,
    );
  } else {
    sentences.push(
      `Based on your answers, the ${ev.brand} ${ev.model} comes out as your strongest all-round match.`,
    );
  }

  // ── Range / daily use ────────────────────────────────────────────────────

  const realWorldMiles = Math.round(ev.rangeKm * 0.621371 * REAL_WORLD_FACTOR);

  if (consultation.daily_miles && consultation.daily_miles > 0) {
    const ratio = realWorldMiles / consultation.daily_miles;
    if (ratio >= 3) {
      sentences.push(
        `Its ${realWorldMiles}mi real-world range covers your ${consultation.daily_miles}mi daily drive ${Math.floor(ratio)} times over — you'd rarely need to think about charging.`,
      );
    } else if (ratio >= 1.5) {
      sentences.push(
        `${realWorldMiles}mi of real-world range fits your ${consultation.daily_miles}mi daily commute comfortably, with room to spare most days.`,
      );
    } else {
      sentences.push(
        `Range is workable for your ${consultation.daily_miles}mi daily drive, but charging regularly (ideally overnight) will keep things stress-free.`,
      );
    }
  } else {
    sentences.push(
      `Its ${realWorldMiles}mi real-world range suits most UK driving patterns without range anxiety.`,
    );
  }

  // ── Charging ─────────────────────────────────────────────────────────────

  if (consultation.home_charging === true) {
    sentences.push(
      `Home charging means you'll start every day with a full battery — keeping energy costs low and convenience high.`,
    );
  } else if (consultation.public_charging_ok === true) {
    const hasCCS = ev.chargingStandard?.toUpperCase().includes("CCS") ?? false;
    if (hasCCS) {
      sentences.push(
        `CCS charging ensures it works at the vast majority of UK public charge points, making top-ups straightforward on the go.`,
      );
    }
  }

  // ── Monthly cost ─────────────────────────────────────────────────────────

  if (bd.monthly_cost_fit >= 12) {
    const cost = top.estimated_monthly_cost;
    sentences.push(
      `All-in running costs come to approximately £${cost}/month — energy, finance, insurance, and servicing included.`,
    );
  }

  return sentences.slice(0, 4).join(" ");
}
