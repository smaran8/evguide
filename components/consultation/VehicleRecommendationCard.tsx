"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PoundSterling,
  Zap,
  AlertCircle,
} from "lucide-react";
import { usePlatformTrack } from "@/hooks/usePlatformTrack";
import type { RecommendationOutput } from "@/lib/recommendation-engine";
import type { ChargingOutput } from "@/lib/charging-engine";
import type { FinanceOutput } from "@/lib/finance-engine";

const RANK_LABELS = ["Top Match", "Strong Alternative", "Also Consider"] as const;

const RANGE_VERDICT_STYLES = {
  comfortable: "bg-[#E8F8F5] text-[#1FBF9F] border-[#D1F2EB]",
  caution:     "bg-amber-50 text-amber-600 border-amber-100",
  tight:       "bg-red-50 text-red-600 border-red-100",
} as const;

interface Props {
  result: RecommendationOutput;
  /** Pre-computed charging engine output for this vehicle */
  chargingOutput?: ChargingOutput;
  /** Pre-computed finance engine output for this vehicle */
  financeOutput?: FinanceOutput;
}

export default function VehicleRecommendationCard({ result, chargingOutput, financeOutput }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const track = usePlatformTrack();

  const {
    rank,
    vehicle,
    match_score,
    reasons,
    tradeoffs,
    estimated_monthly_cost,
    charging_fit_summary,
    savings_summary,
    explanation,
  } = result;

  const isTopMatch = rank === 1;

  function handleViewClick() {
    track("clicked_recommended_vehicle", { vehicleId: vehicle.id, metadata: { rank } });
  }

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-[2rem] border bg-white transition-shadow hover:shadow-md ${
        isTopMatch ? "border-[#1FBF9F] shadow-sm" : "border-[#E5E7EB]"
      }`}
    >
      {/* Top ribbon */}
      <div
        className={`flex items-center justify-between px-5 py-3 ${
          isTopMatch ? "bg-[#E8F8F5]" : "bg-[#F8FAF9]"
        }`}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${
            isTopMatch ? "text-[#1FBF9F]" : "text-[#6B7280]"
          }`}
        >
          {RANK_LABELS[rank - 1]}
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${
            isTopMatch
              ? "border-[#1FBF9F]/30 bg-white text-[#1FBF9F]"
              : "border-[#E5E7EB] bg-white text-[#374151]"
          }`}
        >
          {match_score}%
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Vehicle name */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
            {vehicle.brand}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-[#1A1A1A]">{vehicle.model}</h3>
          {vehicle.variant && (
            <p className="mt-0.5 text-sm text-[#6B7280]">{vehicle.variant}</p>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricPill
            icon={<PoundSterling className="h-3.5 w-3.5" />}
            label="Est. monthly"
            value={`£${estimated_monthly_cost}/mo`}
          />
          <MetricPill
            icon={<BatteryCharging className="h-3.5 w-3.5" />}
            label="Range"
            value={`${Math.round(vehicle.rangeKm * 0.621)}mi`}
          />
          <MetricPill
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Battery"
            value={`${vehicle.batteryKWh}kWh`}
          />
          <MetricPill
            icon={<PoundSterling className="h-3.5 w-3.5" />}
            label="Price"
            value={`£${vehicle.price.toLocaleString()}`}
          />
        </div>

        {/* Explanation (top match only) */}
        {isTopMatch && explanation && (
          <div className="rounded-[1.5rem] border border-[#D1F2EB] bg-[#E8F8F5] p-4">
            <p className="text-sm leading-6 text-[#1A1A1A]">{explanation}</p>
          </div>
        )}

        {/* Reasons */}
        {reasons.length > 0 && (
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F8FAF9] p-4">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
              Why it fits
            </p>
            <ul className="space-y-2">
              {reasons.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm leading-5 text-[#374151]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1FBF9F]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tradeoffs */}
        {tradeoffs.length > 0 && (
          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
              Worth noting
            </p>
            <ul className="space-y-2">
              {tradeoffs.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm leading-5 text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Charging + savings */}
        <div className="space-y-2">
          {charging_fit_summary && (
            <p className="text-xs leading-5 text-[#6B7280]">
              <span className="font-medium text-[#374151]">Charging: </span>
              {charging_fit_summary}
            </p>
          )}
          {savings_summary && (
            <p className="text-xs leading-5 text-[#6B7280]">
              <span className="font-medium text-[#374151]">Savings: </span>
              {savings_summary}
            </p>
          )}
        </div>

        {/* Score breakdown toggle */}
        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] transition hover:text-[#1FBF9F]"
        >
          {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Score breakdown
        </button>

        {showBreakdown && (
          <div className="rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] p-4">
            <ScoreBar label="Budget fit"       score={result.breakdown.budget_fit}       max={25} />
            <ScoreBar label="Range fit"        score={result.breakdown.range_fit}        max={20} />
            <ScoreBar label="Charging fit"     score={result.breakdown.charging_fit}     max={15} />
            <ScoreBar label="Body type"        score={result.breakdown.body_type_fit}    max={15} />
            <ScoreBar label="Monthly cost"     score={result.breakdown.monthly_cost_fit} max={15} />
            <ScoreBar label="Motivation match" score={result.breakdown.motivation_fit}   max={10} />
          </div>
        )}

        {/* Compact intelligence row */}
        {(chargingOutput || financeOutput) && (
          <div className="grid grid-cols-2 gap-2">
            {chargingOutput && (
              <div
                className={`flex flex-col gap-0.5 rounded-[1rem] border px-3 py-2 ${
                  RANGE_VERDICT_STYLES[chargingOutput.rangeVerdict]
                }`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-[0.15em] opacity-70">
                  Range fit
                </span>
                <span className="text-xs font-bold">
                  {chargingOutput.rangeConfidenceScore}% confident
                </span>
                <span className="text-[10px] opacity-80">
                  {chargingOutput.realWorldRangeMiles} mi real-world
                </span>
              </div>
            )}
            {financeOutput && (
              <div
                className={`flex flex-col gap-0.5 rounded-[1rem] border px-3 py-2 ${
                  financeOutput.affordabilityBand === "comfortable" ? "bg-[#E8F8F5] text-[#1FBF9F] border-[#D1F2EB]"
                  : financeOutput.affordabilityBand === "manageable" ? "bg-blue-50 text-blue-600 border-blue-100"
                  : financeOutput.affordabilityBand === "stretch"    ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-red-50 text-red-600 border-red-100"
                }`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-[0.15em] opacity-70">
                  Affordability
                </span>
                <span className="text-xs font-bold">
                  £{financeOutput.totalEstimatedMonthlyCost}/mo
                </span>
                <span className="text-[10px] capitalize opacity-80">
                  {financeOutput.affordabilityBand.replace("_", " ")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/cars/${vehicle.id}`}
          onClick={handleViewClick}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1FBF9F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17A589]"
        >
          View {vehicle.brand} {vehicle.model}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[#E5E7EB] bg-[#F8FAF9] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[#6B7280]">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-[#1A1A1A]">{value}</p>
    </div>
  );
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-[#374151]">{label}</span>
        <span className="text-[#6B7280]">
          {score}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="h-full rounded-full bg-[#1FBF9F] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
