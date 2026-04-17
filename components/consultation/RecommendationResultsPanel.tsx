"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import VehicleRecommendationCard from "@/components/consultation/VehicleRecommendationCard";
import FinanceSummaryCard from "@/components/consultation/FinanceSummaryCard";
import ChargingFitCard from "@/components/consultation/ChargingFitCard";
import { usePlatformTrack } from "@/hooks/usePlatformTrack";
import type { RecommendationOutput } from "@/lib/recommendation-engine";
import type { ConsultationFormState } from "@/types/consultation";
import { getPlatformSessionId } from "@/lib/platform/session";
import { runFinanceEngine } from "@/lib/finance-engine";
import { runChargingEngine } from "@/lib/charging-engine";
import type { FinanceOutput } from "@/lib/finance-engine";
import type { ChargingOutput } from "@/lib/charging-engine";

interface Props {
  consultationId: string;
  state: ConsultationFormState;
  /** If pre-fetched server-side, pass results directly to skip the client fetch */
  initialResults?: RecommendationOutput[] | null;
  onRetake?: () => void;
}

/**
 * Renders the 3-card recommendation grid.
 *
 * If initialResults is provided (server-fetched), renders immediately.
 * Otherwise makes a client-side POST to /api/recommendations.
 *
 * Use as:
 *   - Embedded inside ConsultationWizard after completion
 *   - On the standalone /consultation/results page
 */
export default function RecommendationResultsPanel({
  consultationId,
  state,
  initialResults,
  onRetake,
}: Props) {
  const [results, setResults] = useState<RecommendationOutput[] | null>(initialResults ?? null);
  const [loading, setLoading] = useState(!initialResults);
  const [error, setError] = useState<string | null>(null);
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  const track = usePlatformTrack();

  // ── Run engines for each result ───────────────────────────────────────────
  // Pure functions — safe to run in useMemo on the client

  const engineOutputs = useMemo<
    Record<string, { finance: FinanceOutput; charging: ChargingOutput }>
  >(() => {
    if (!results) return {};
    const out: Record<string, { finance: FinanceOutput; charging: ChargingOutput }> = {};
    for (const r of results) {
      const v = r.vehicle;
      out[v.id] = {
        finance: runFinanceEngine({
          vehiclePrice:    v.price,
          annualMiles:     state.yearly_miles ?? 7_500,
          batteryKWh:      v.batteryKWh,
          rangeKm:         v.rangeKm,
          homeCharging:    state.home_charging ?? undefined,
          targetMonthlyGbp: state.target_monthly_payment_gbp ?? undefined,
        }),
        charging: runChargingEngine({
          batteryKWh:         v.batteryKWh,
          rangeKm:            v.rangeKm,
          chargingSpeedAcKw:  v.chargingSpeedAcKw,
          chargingSpeedDcKw:  v.chargingSpeedDcKw,
          chargeTimeTo80Mins: v.chargeTimeTo80Mins,
          chargingStandard:   v.chargingStandard,
          dailyMiles:         state.daily_miles ?? undefined,
          weeklyMiles:        state.weekly_miles ?? undefined,
          homeCharging:       state.home_charging ?? undefined,
          publicChargingOk:   state.public_charging_ok ?? undefined,
        }),
      };
    }
    return out;
  }, [results, state]);

  useEffect(() => {
    if (initialResults) return; // Already have results

    async function fetchRecommendations() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultation_id: consultationId,
            session_id: getPlatformSessionId(),
            state,
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? "Failed to generate recommendations.");
          return;
        }

        const data = (await res.json()) as { results: RecommendationOutput[] };
        setResults(data.results);

        track("viewed_ai_recommendation", {
          metadata: {
            consultation_id: consultationId,
            match_count: data.results.length,
            top_score: data.results[0]?.match_score,
          },
        });
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void fetchRecommendations();
    // Only run on mount — consultationId and state are stable after wizard completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D1F2EB] bg-[#E8F8F5]">
          <Loader2 className="h-6 w-6 animate-spin text-[#1FBF9F]" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-[#1A1A1A]">Matching your perfect EVs…</p>
          <p className="mt-1 text-sm text-[#6B7280]">Scoring against your budget, range, and preferences.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-base font-medium text-[#1A1A1A]">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-medium text-[#374151] transition hover:border-[#1FBF9F]/40"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  if (!results || results.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D1F2EB] bg-[#E8F8F5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#1FBF9F]">
          <Sparkles className="h-3.5 w-3.5" />
          Your EV Matches
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-[#1A1A1A]">
          {results.length === 1
            ? "Your best EV match"
            : `Your top ${results.length} EV matches`}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          Ranked by how well each EV fits your answers — budget, range, charging, and lifestyle.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="rounded-[1rem] border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3 text-xs leading-5 text-[#6B7280]">
        Match scores are calculated using your stated preferences. Monthly cost estimates include
        finance, energy, insurance, and servicing. Always verify figures independently before
        making a purchase decision.
      </p>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => {
          const engines = engineOutputs[r.vehicle.id];
          return (
            <div key={r.vehicle.id} className="flex flex-col gap-3">
              <VehicleRecommendationCard
                result={r}
                chargingOutput={engines?.charging}
                financeOutput={engines?.finance}
              />
              {/* Expand / collapse detail button */}
              {engines && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedVehicleId(
                      expandedVehicleId === r.vehicle.id ? null : r.vehicle.id,
                    )
                  }
                  className="text-xs font-medium text-[#6B7280] underline-offset-2 transition hover:text-[#1FBF9F] hover:underline"
                >
                  {expandedVehicleId === r.vehicle.id
                    ? "Hide finance & charging detail"
                    : "See full finance & charging breakdown"}
                </button>
              )}
              {/* Detail cards — shown when expanded */}
              {expandedVehicleId === r.vehicle.id && engines && (
                <div className="grid gap-4">
                  <FinanceSummaryCard
                    finance={engines.finance}
                    vehicleName={`${r.vehicle.brand} ${r.vehicle.model}`}
                    vehicleId={r.vehicle.id}
                  />
                  <ChargingFitCard
                    charging={engines.charging}
                    vehicleName={`${r.vehicle.brand} ${r.vehicle.model}`}
                    vehicleId={r.vehicle.id}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Retake link */}
      {onRetake && (
        <div className="text-center">
          <button
            type="button"
            onClick={onRetake}
            className="text-sm font-medium text-[#6B7280] underline-offset-2 transition hover:text-[#1FBF9F] hover:underline"
          >
            Retake consultation with different answers
          </button>
        </div>
      )}
    </div>
  );
}
