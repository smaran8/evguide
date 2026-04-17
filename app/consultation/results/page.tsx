/**
 * /consultation/results?consultation_id=<uuid>
 *
 * Server component — fetches the consultation row from the DB, runs the
 * recommendation engine server-side, and renders RecommendationResultsPanel
 * with pre-fetched results (no client-side API call needed).
 *
 * Falls back gracefully: if no consultation_id is supplied or the row cannot
 * be found, shows a prompt to retake the consultation.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import PremiumNavbar from "@/components/home/PremiumNavbar";
import PremiumFooter from "@/components/home/PremiumFooter";
import RecommendationResultsPanel from "@/components/consultation/RecommendationResultsPanel";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRecommendationEngine } from "@/lib/recommendation-engine";
import {
  EMPTY_CONSULTATION,
  type ConsultationFormState,
  type EvReason,
  type ChargingSpeedImportance,
  type RangePriority,
  type PerformancePriority,
} from "@/types/consultation";

export const metadata: Metadata = {
  title: "Your EV Matches | EVGuide AI",
  description:
    "Based on your consultation, here are the EVs best matched to your budget, range, and lifestyle.",
};

// Opt out of caching — results are personalised per consultation
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ConsultationResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawId = params["consultation_id"];
  const consultationId = typeof rawId === "string" && rawId.trim().length > 0
    ? rawId.trim()
    : null;

  // ── Fetch consultation row ──────────────────────────────────────────────────

  let state: ConsultationFormState | null = null;

  if (consultationId) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("consultations")
        .select(
          [
            "main_reason_for_ev",
            "budget_min_gbp",
            "budget_max_gbp",
            "target_monthly_payment_gbp",
            "daily_miles",
            "weekly_miles",
            "yearly_miles",
            "family_size",
            "home_charging",
            "public_charging_ok",
            "charging_speed_importance",
            "body_type_preference",
            "brand_preference",
            "range_priority",
            "performance_priority",
            "notes",
          ].join(","),
        )
        .eq("id", consultationId)
        .single();

      if (!error && data) {
        state = mapRowToState(data);
      }
    } catch {
      // Leave state null — handled below
    }
  }

  // ── Run engine server-side when we have a consultation ─────────────────────

  const initialResults = state ? runRecommendationEngine(state) : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#F8FAF9]">
      <PremiumNavbar />

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-32 sm:px-6">
        {/* No consultation ID or not found */}
        {!state || !initialResults || initialResults.length === 0 ? (
          <NoResultsFallback hasId={!!consultationId} />
        ) : (
          <RecommendationResultsPanel
            consultationId={consultationId!}
            state={state}
            initialResults={initialResults}
          />
        )}
      </div>

      <PremiumFooter />
    </main>
  );
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function NoResultsFallback({ hasId }: { hasId: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D1F2EB] bg-[#E8F8F5]">
        <Sparkles className="h-6 w-6 text-[#1FBF9F]" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">
          {hasId ? "No matches found" : "Start your consultation first"}
        </h1>
        <p className="mt-3 max-w-sm text-base leading-7 text-[#6B7280]">
          {hasId
            ? "We couldn't find EVs matching your criteria. Try adjusting your budget or preferences."
            : "Answer five quick questions so we can match you to the right EV."}
        </p>
      </div>
      <Link
        href="/consultation"
        className="inline-flex items-center gap-2 rounded-full bg-[#1FBF9F] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#17A589]"
      >
        <Sparkles className="h-4 w-4" />
        {hasId ? "Retake consultation" : "Start consultation"}
      </Link>
    </div>
  );
}

// ── Row → FormState mapper ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToState(row: Record<string, any>): ConsultationFormState {
  return {
    ...EMPTY_CONSULTATION,
    main_reason_for_ev: (row.main_reason_for_ev as EvReason) ?? "",
    budget_min_gbp:               toNumber(row.budget_min_gbp),
    budget_max_gbp:               toNumber(row.budget_max_gbp),
    target_monthly_payment_gbp:   toNumber(row.target_monthly_payment_gbp),
    daily_miles:                  toNumber(row.daily_miles),
    weekly_miles:                 toNumber(row.weekly_miles),
    yearly_miles:                 toNumber(row.yearly_miles),
    family_size:                  toNumber(row.family_size),
    home_charging:                toBool(row.home_charging),
    public_charging_ok:           toBool(row.public_charging_ok),
    charging_speed_importance:    (row.charging_speed_importance as ChargingSpeedImportance) ?? null,
    body_type_preference:         row.body_type_preference ?? null,
    brand_preference:             Array.isArray(row.brand_preference) ? row.brand_preference as string[] : [],
    range_priority:               (row.range_priority as RangePriority) ?? null,
    performance_priority:         (row.performance_priority as PerformancePriority) ?? null,
    notes:                        typeof row.notes === "string" ? row.notes : "",
  };
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  return null;
}
