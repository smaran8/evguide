/**
 * components/recommendation/RecommendationResults.tsx
 *
 * Displays the top-3 recommendations returned by the scoring engine.
 * Rendered after the wizard form is submitted and results arrive.
 *
 * Features:
 *   - Summary header with the user's key inputs (budget, usage type)
 *   - 3-column responsive grid of RecommendationCard components
 *   - "Compare all" shortcut to the /compare page
 *   - "Start Over" button to reset the wizard
 */

"use client";

import Link from "next/link";
import RecommendationCard from "./RecommendationCard";
import type { RecommendationResult, UserPreferences } from "@/types";

interface Props {
  results: RecommendationResult[];
  preferences: UserPreferences;
  preferenceId: string | null;
  onReset: () => void;
}

export default function RecommendationResults({ results, preferences, preferenceId, onReset }: Props) {
  if (results.length === 0) {
    // Empty state — shown if the scoring engine found no matches
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">No matches found</h2>
        <p className="mt-2 text-sm text-slate-500">
          No EVs fit your current preferences. Try raising your budget or changing your requirements.
        </p>
        <button
          onClick={onReset}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Adjust Preferences
        </button>
      </div>
    );
  }

  // Human-readable label for usage type
  const usageLabel: Record<string, string> = {
    city:    "City driving",
    highway: "Highway/long distance",
    mixed:   "Mixed driving",
  };

  const chargingLabel: Record<string, string> = {
    home:   "Home charger",
    public: "Public network",
    none:   "No dedicated charger",
  };

  return (
    <section>
      {/* ── Results header ── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Your Matches
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Top {results.length} EVs for your needs
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Scored across affordability, range, charging, and family fit
            </p>
          </div>

          {/* Preference summary pills */}
          <div className="flex flex-wrap gap-2">
            <PreferencePill label="Budget" value={`£${preferences.totalBudget.toLocaleString()}`} />
            <PreferencePill label="Usage" value={usageLabel[preferences.usageType]} />
            <PreferencePill label="Charging" value={chargingLabel[preferences.chargingAccess]} />
            <PreferencePill label="Family" value={`${preferences.familySize} people`} />
          </div>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <RecommendationCard key={result.ev.id} result={result} preferenceId={preferenceId} />
        ))}
      </div>

      {/* ── Action row ── */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap gap-3">
          {/* Compare the recommended EVs (pass IDs as query params) */}
          <Link
            href={`/compare?evs=${results.map((r) => r.ev.id).join(",")}`}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-600"
          >
            Compare These EVs
          </Link>
          <Link
            href="/vehicles"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-600"
          >
            Browse All Vehicles
          </Link>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Start Over
        </button>
      </div>
    </section>
  );
}

// ── Small helper: single preference summary pill ──────────────────────────────
function PreferencePill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
      <span className="font-medium text-slate-500">{label}:</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </span>
  );
}
