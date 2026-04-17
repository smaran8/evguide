"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  PoundSterling,
  TrendingDown,
  Wallet,
  Info,
} from "lucide-react";
import { usePlatformTrack } from "@/hooks/usePlatformTrack";
import type { FinanceOutput, AffordabilityBand, FinanceFitStatus } from "@/lib/finance-engine";

// ── Status config ─────────────────────────────────────────────────────────────

const BAND_CONFIG: Record<
  AffordabilityBand,
  { label: string; bg: string; text: string; border: string }
> = {
  comfortable:  { label: "Comfortable",  bg: "bg-[#E8F8F5]", text: "text-[#1FBF9F]", border: "border-[#D1F2EB]" },
  manageable:   { label: "Manageable",   bg: "bg-blue-50",   text: "text-blue-600",  border: "border-blue-100" },
  stretch:      { label: "Stretch",      bg: "bg-amber-50",  text: "text-amber-600", border: "border-amber-100" },
  over_budget:  { label: "Over Budget",  bg: "bg-red-50",    text: "text-red-600",   border: "border-red-100" },
};

const FIT_CONFIG: Record<
  FinanceFitStatus,
  { label: string; icon: string; color: string }
> = {
  finance_ready:     { label: "Finance Ready",      icon: "✓", color: "text-[#1FBF9F]" },
  budget_tight:      { label: "Budget is Tight",    icon: "!", color: "text-amber-600" },
  deposit_needed:    { label: "More Deposit Needed", icon: "!", color: "text-amber-600" },
  not_recommended:   { label: "Over Budget",        icon: "✕", color: "text-red-500" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  finance: FinanceOutput;
  vehicleName?: string;
  /** Pass vehicleId to enable "viewed_finance_offer" tracking */
  vehicleId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinanceSummaryCard({ finance, vehicleName, vehicleId }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const track = usePlatformTrack();

  const band    = BAND_CONFIG[finance.affordabilityBand];
  const fitConf = FIT_CONFIG[finance.financeFitStatus];

  function handleToggleBreakdown() {
    setShowBreakdown((v) => !v);
    if (!showBreakdown) {
      track("viewed_finance_offer", {
        vehicleId,
        metadata: {
          vehicle_name:   vehicleName,
          affordability:  finance.affordabilityBand,
          total_monthly:  finance.totalEstimatedMonthlyCost,
        },
      });
    }
  }

  return (
    <article className="rounded-[2rem] border border-[#E5E7EB] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#F8FAF9] px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D1F2EB] bg-[#E8F8F5]">
            <PoundSterling className="h-4 w-4 text-[#1FBF9F]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
              Finance Summary
            </p>
            {vehicleName && (
              <p className="text-sm font-semibold text-[#1A1A1A]">{vehicleName}</p>
            )}
          </div>
        </div>

        {/* Affordability badge */}
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${band.bg} ${band.text} ${band.border}`}
        >
          {band.label}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Total monthly hero */}
        <div className="rounded-[1.5rem] border border-[#D1F2EB] bg-[#E8F8F5] p-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
            Estimated total monthly cost
          </p>
          <p className="mt-1 text-3xl font-bold text-[#1A1A1A]">
            £{finance.totalEstimatedMonthlyCost}
            <span className="ml-1 text-sm font-normal text-[#6B7280]">/mo</span>
          </p>
          {finance.monthlyHeadroom !== null && (
            <p className={`mt-1 text-xs font-medium ${finance.monthlyHeadroom >= 0 ? "text-[#1FBF9F]" : "text-red-500"}`}>
              {finance.monthlyHeadroom >= 0
                ? `£${finance.monthlyHeadroom} headroom vs your budget`
                : `£${Math.abs(finance.monthlyHeadroom)} over your budget`}
            </p>
          )}
        </div>

        {/* Affordability summary */}
        <p className="text-sm leading-6 text-[#4B5563]">{finance.affordabilitySummary}</p>

        {/* Finance-ready status */}
        <div className="flex items-center justify-between rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3">
          <span className="text-sm font-medium text-[#374151]">Finance status</span>
          <span className={`flex items-center gap-1.5 text-sm font-semibold ${fitConf.color}`}>
            <span>{fitConf.icon}</span>
            {fitConf.label}
          </span>
        </div>

        {/* Signals & warnings */}
        {(finance.financeReadySignals.length > 0 || finance.financeWarnings.length > 0) && (
          <div className="space-y-2">
            {finance.financeReadySignals.map((s) => (
              <div key={s} className="flex items-start gap-2.5 text-sm leading-5 text-[#374151]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1FBF9F]" />
                {s}
              </div>
            ))}
            {finance.financeWarnings.map((w) => (
              <div key={w} className="flex items-start gap-2.5 text-sm leading-5 text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Breakdown toggle */}
        <button
          type="button"
          onClick={handleToggleBreakdown}
          className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] transition hover:text-[#1FBF9F]"
        >
          {showBreakdown
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
          Monthly cost breakdown
        </button>

        {showBreakdown && (
          <div className="rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] p-4 space-y-2.5">
            <CostRow label="Loan / EMI"    value={finance.breakdown.emiGbp} />
            <CostRow label="Electricity"   value={finance.breakdown.chargingMonthlyGbp} />
            <CostRow label="Insurance"     value={finance.breakdown.insuranceMonthlyGbp} />
            <CostRow label="Servicing"     value={finance.breakdown.servicingMonthlyGbp} />
            {finance.breakdown.vedMonthlyGbp > 0 && (
              <CostRow label="VED (road tax)" value={finance.breakdown.vedMonthlyGbp} />
            )}
            <div className="border-t border-[#E5E7EB] pt-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1A1A1A]">Total</span>
              <span className="text-sm font-bold text-[#1A1A1A]">
                £{finance.totalEstimatedMonthlyCost}/mo
              </span>
            </div>

            {/* Deposit & repayment info */}
            <div className="mt-3 rounded-[1rem] border border-[#E5E7EB] bg-white px-3 py-2.5 space-y-1.5">
              <InfoRow
                label="Deposit"
                value={`£${finance.depositUsed.toLocaleString()} (${finance.depositAsPercent}%)`}
              />
              <InfoRow
                label={`Over ${finance.termMonths} months at ${finance.aprPct}% APR`}
                value={`£${finance.totalRepayableGbp.toLocaleString()} total`}
              />
              <InfoRow
                label="Interest"
                value={`£${finance.totalInterestGbp.toLocaleString()}`}
              />
              {finance.costPerMilePence !== null && (
                <InfoRow
                  label="Cost per mile"
                  value={`${finance.costPerMilePence}p`}
                />
              )}
            </div>

            {/* Deposit gap nudge */}
            {finance.depositGap > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded-[1rem] border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                Saving an extra £{finance.depositGap.toLocaleString()} would hit the 10% deposit
                most lenders prefer and reduce your monthly payment.
              </div>
            )}
          </div>
        )}

        {/* Savings hint */}
        {finance.breakdown.chargingMonthlyGbp > 0 && (
          <div className="flex items-start gap-2.5 rounded-[1.25rem] border border-[#D1F2EB] bg-[#E8F8F5] px-4 py-3">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[#1FBF9F]" />
            <p className="text-xs leading-5 text-[#374151]">
              <span className="font-medium">Running costs: </span>
              Electricity estimated at £{finance.breakdown.chargingMonthlyGbp}/mo —
              significantly less than petrol. The less you drive on public chargers,
              the lower this gets.
            </p>
          </div>
        )}

        <p className="text-[10px] leading-4 text-[#9CA3AF]">
          <Wallet className="mb-0.5 inline h-3 w-3" />{" "}
          Estimates only. EMI uses {finance.aprPct}% APR representative over {finance.termMonths} months.
          Insurance and servicing are averages. Always confirm figures with a lender before applying.
        </p>
      </div>
    </article>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-medium text-[#374151]">
        £{Math.round(value)}/mo
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-medium text-[#374151]">{value}</span>
    </div>
  );
}
