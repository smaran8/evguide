"use client";

import { useState } from "react";
import {
  BatteryCharging,
  Zap,
  MapPin,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import { usePlatformTrack } from "@/hooks/usePlatformTrack";
import type { ChargingOutput, RangeVerdict, ChargingDependency } from "@/lib/charging-engine";

// ── Config maps ───────────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<
  RangeVerdict,
  { label: string; bg: string; text: string; border: string; fill: string }
> = {
  comfortable: {
    label:  "Great range fit",
    bg:     "bg-[#E8F8F5]",
    text:   "text-[#1FBF9F]",
    border: "border-[#D1F2EB]",
    fill:   "#1FBF9F",
  },
  caution: {
    label:  "Range is workable",
    bg:     "bg-amber-50",
    text:   "text-amber-600",
    border: "border-amber-100",
    fill:   "#D97706",
  },
  tight: {
    label:  "Range may be tight",
    bg:     "bg-red-50",
    text:   "text-red-600",
    border: "border-red-100",
    fill:   "#EF4444",
  },
};

const DEPENDENCY_CONFIG: Record<
  ChargingDependency,
  { label: string; color: string }
> = {
  low:    { label: "Low",    color: "text-[#1FBF9F]" },
  medium: { label: "Medium", color: "text-amber-600" },
  high:   { label: "High",   color: "text-red-500" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  charging: ChargingOutput;
  vehicleName?: string;
  vehicleId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChargingFitCard({ charging, vehicleName, vehicleId }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const track = usePlatformTrack();

  const verdictConf = VERDICT_CONFIG[charging.rangeVerdict];
  const depConf     = DEPENDENCY_CONFIG[charging.publicChargingDependency];

  function handleToggleDetails() {
    setShowDetails((v) => !v);
    if (!showDetails) {
      track("viewed_charging_time", {
        vehicleId,
        metadata: {
          vehicle_name:     vehicleName,
          range_confidence: charging.rangeConfidenceScore,
          charging_fit:     charging.chargingFitScore,
        },
      });
    }
  }

  function handleViewCostEstimate() {
    track("viewed_charge_cost_estimate", {
      vehicleId,
      metadata: {
        vehicle_name:   vehicleName,
        monthly_cost:   charging.monthlyChargeCostGbp,
        weekly_cost:    charging.weeklyChargeCostGbp,
      },
    });
  }

  return (
    <article className="rounded-[2rem] border border-[#E5E7EB] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#F8FAF9] px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D1F2EB] bg-[#E8F8F5]">
            <BatteryCharging className="h-4 w-4 text-[#1FBF9F]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
              Charging Confidence
            </p>
            {vehicleName && (
              <p className="text-sm font-semibold text-[#1A1A1A]">{vehicleName}</p>
            )}
          </div>
        </div>

        {/* Range verdict badge */}
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${verdictConf.bg} ${verdictConf.text} ${verdictConf.border}`}
        >
          {verdictConf.label}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Score pair */}
        <div className="grid grid-cols-2 gap-3">
          <ScoreGauge
            label="Range confidence"
            score={charging.rangeConfidenceScore}
            fill={verdictConf.fill}
          />
          <ScoreGauge
            label="Charging fit"
            score={charging.chargingFitScore}
            fill="#1FBF9F"
          />
        </div>

        {/* Range verdict text */}
        <p className="text-sm leading-6 text-[#4B5563]">{charging.rangeVerdictText}</p>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-2">
          <MetricPill
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Charges/wk"
            value={String(charging.estimatedChargesPerWeek)}
          />
          <MetricPill
            icon={<Clock className="h-3.5 w-3.5" />}
            label="To 80%"
            value={charging.chargeTimeTo80Label ?? "—"}
          />
          <MetricPill
            icon={<BatteryCharging className="h-3.5 w-3.5" />}
            label="Est./month"
            value={`£${charging.monthlyChargeCostGbp}`}
            onClick={handleViewCostEstimate}
          />
        </div>

        {/* Home charging summary */}
        <div className="rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B7280]">
              Home charging
            </p>
          </div>
          <p className="text-sm leading-5 text-[#374151]">{charging.homeChargingSummary}</p>
        </div>

        {/* Public charging dependency */}
        <div className="flex items-center justify-between rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#6B7280]" />
            <span className="text-sm text-[#374151]">Public charging dependency</span>
          </div>
          <span className={`text-sm font-semibold ${depConf.color}`}>{depConf.label}</span>
        </div>

        {/* Details toggle */}
        <button
          type="button"
          onClick={handleToggleDetails}
          className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] transition hover:text-[#1FBF9F]"
        >
          {showDetails
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
          Full charging details
        </button>

        {showDetails && (
          <div className="rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] p-4 space-y-3">
            {/* Range details */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                Range breakdown
              </p>
              <div className="space-y-1.5">
                <RangeRow label="WLTP official"   miles={charging.wltpMiles} />
                <RangeRow label="Real-world est." miles={charging.realWorldRangeMiles} accent />
                <RangeRow label="Winter worst-case" miles={charging.winterRangeMiles} />
              </div>
            </div>

            {/* Charge times */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                Charge times
              </p>
              <p className="text-sm leading-5 text-[#374151]">{charging.chargingTimeSummary}</p>
            </div>

            {/* Cost breakdown */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                Cost estimate
              </p>
              <p className="text-sm leading-5 text-[#374151]">{charging.chargeCostSummary}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-[0.75rem] border border-[#E5E7EB] bg-white px-2.5 py-2">
                  <p className="text-[#6B7280]">Per week</p>
                  <p className="mt-0.5 font-semibold text-[#1A1A1A]">
                    £{charging.weeklyChargeCostGbp.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-[0.75rem] border border-[#E5E7EB] bg-white px-2.5 py-2">
                  <p className="text-[#6B7280]">Per month</p>
                  <p className="mt-0.5 font-semibold text-[#1A1A1A]">
                    £{charging.monthlyChargeCostGbp.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Public dependency detail */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                Public charging
              </p>
              <p className="text-sm leading-5 text-[#374151]">
                {charging.publicChargingDependencySummary}
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {charging.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B7280]">
              Recommendations
            </p>
            {charging.recommendations.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-[1rem] border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {r}
              </div>
            ))}
          </div>
        )}

        {charging.recommendations.length === 0 && (
          <div className="flex items-start gap-2.5 rounded-[1rem] border border-[#D1F2EB] bg-[#E8F8F5] px-3 py-2.5 text-sm leading-5 text-[#1A1A1A]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1FBF9F]" />
            This vehicle&apos;s charging setup is a strong fit for your situation.
          </div>
        )}

        <p className="text-[10px] leading-4 text-[#9CA3AF]">
          <Gauge className="mb-0.5 inline h-3 w-3" />{" "}
          Range estimates use WLTP ×0.82 real-world factor. Charge costs use 28p/kWh home and
          65p/kWh public (UK averages, April 2026). Actual results may vary.
        </p>
      </div>
    </article>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreGauge({
  label,
  score,
  fill,
}: {
  label: string;
  score: number;
  fill: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] px-3 py-3">
      {/* Mini arc indicator */}
      <div className="relative flex h-12 w-12 items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-12 w-12 -rotate-90">
          {/* Track */}
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 16 * 0.75} ${2 * Math.PI * 16 * 0.25}`}
            strokeDashoffset={2 * Math.PI * 16 * 0.25 / 2}
            strokeLinecap="round"
          />
          {/* Fill */}
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke={fill}
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 16 * 0.75 * (score / 100)} ${2 * Math.PI * 16 - 2 * Math.PI * 16 * 0.75 * (score / 100)}`}
            strokeDashoffset={2 * Math.PI * 16 * 0.25 / 2}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute text-xs font-bold text-[#1A1A1A]">{score}</span>
      </div>
      <p className="text-center text-[10px] font-medium leading-4 text-[#6B7280]">{label}</p>
    </div>
  );
}

function MetricPill({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1rem] border border-[#E5E7EB] bg-[#F8FAF9] px-2.5 py-2 text-left ${onClick ? "cursor-pointer hover:border-[#1FBF9F]/40" : "cursor-default"}`}
    >
      <div className="flex items-center gap-1 text-[#6B7280]">
        {icon}
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className="mt-1 text-xs font-semibold text-[#1A1A1A]">{value}</p>
    </button>
  );
}

function RangeRow({
  label,
  miles,
  accent = false,
}: {
  label: string;
  miles: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={accent ? "font-medium text-[#374151]" : "text-[#6B7280]"}>{label}</span>
      <span className={accent ? "font-bold text-[#1A1A1A]" : "font-medium text-[#374151]"}>
        {miles} mi
      </span>
    </div>
  );
}
