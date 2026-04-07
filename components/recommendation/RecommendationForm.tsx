"use client";

import { useRef, useState } from "react";
import { getRecommendations } from "@/lib/actions/recommendations";
import { trackEvent } from "@/lib/tracking/client";
import RecommendationResults from "./RecommendationResults";
import type {
  BodyType,
  ChargingAccess,
  RecommendationResult,
  UsageType,
  UserPreferences,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Initial (empty) form state
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_PREFS: UserPreferences = {
  monthlyIncome:      4000,
  totalBudget:        35000,
  downPayment:        5000,
  preferredMonthlyEmi: 400,
  usageType:          "mixed",
  familySize:         2,
  chargingAccess:     "home",
  preferredBodyType:  "any",
};

type WizardStep = 1 | 2 | 3;

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function RecommendationForm() {
  const [step, setStep]             = useState<WizardStep>(1);
  const [prefs, setPrefs]           = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [results, setResults]         = useState<RecommendationResult[] | null>(null);
  const [savedPrefs, setSavedPrefs]   = useState<UserPreferences | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const hasTrackedStart = useRef(false);

  // Helper to update one field at a time
  function update<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  // ── Step validation ────────────────────────────────────────────────────────
  function validateStep(): string | null {
    if (step === 1) {
      if (prefs.monthlyIncome <= 0)       return "Please enter a valid monthly income.";
      if (prefs.totalBudget <= 0)         return "Please enter a valid total budget.";
      if (prefs.downPayment < 0)          return "Down payment cannot be negative.";
      if (prefs.downPayment >= prefs.totalBudget) return "Down payment must be less than total budget.";
      if (prefs.preferredMonthlyEmi <= 0) return "Please enter a valid monthly EMI target.";
    }
    if (step === 2) {
      if (prefs.familySize < 1 || prefs.familySize > 10) return "Family size must be 1–10.";
    }
    return null;
  }

  // ── Navigate forward ───────────────────────────────────────────────────────
  function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true;
      void trackEvent({
        eventType: "recommendation_started",
        eventValue: {
          step,
          budget: prefs.totalBudget,
          preferred_body_type: prefs.preferredBodyType,
          usage_type: prefs.usageType,
        },
      });
    }
    setStep((s) => Math.min(3, s + 1) as WizardStep);
  }

  // ── Submit on final step ───────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);
    setLoading(true);
    setSavedPrefs(prefs); // snapshot preferences so results screen can show them

    const { results: res, preferenceId: prefId, error: err } = await getRecommendations(prefs);

    setLoading(false);

    if (err) {
      setError(err);
      return;
    }
    setPreferenceId(prefId);
    setResults(res);
    void trackEvent({
      eventType: "recommendation_completed",
      eventValue: {
        preference_id: prefId,
        result_count: res.length,
        top_match_id: res[0]?.ev.id ?? null,
        top_match_score: res[0]?.score ?? null,
      },
    });
  }

  // ── Reset wizard ───────────────────────────────────────────────────────────
  function handleReset() {
    setResults(null);
    setSavedPrefs(null);
    setPreferenceId(null);
    setPrefs(DEFAULT_PREFS);
    setStep(1);
    setError(null);
    hasTrackedStart.current = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: results view
  // ─────────────────────────────────────────────────────────────────────────
  if (results !== null && savedPrefs) {
    return (
      <RecommendationResults
        results={results}
        preferences={savedPrefs}
        preferenceId={preferenceId}
        onReset={handleReset}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: loading state
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingState />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: wizard form
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Form card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Error banner */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Step panels */}
        {step === 1 && <StepBudget prefs={prefs} update={update} />}
        {step === 2 && <StepLifestyle prefs={prefs} update={update} />}
        {step === 3 && <StepPreference prefs={prefs} update={update} />}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { setError(null); setStep((s) => Math.max(1, s - 1) as WizardStep); }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <div /> /* spacer */
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Continue
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Find My Best Match
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Small privacy note */}
      <p className="mt-4 text-center text-xs text-slate-400">
        Your data is used only to generate recommendations and is never sold to third parties.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Step indicator (3 numbered circles + connector lines)
// ─────────────────────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { num: 1 as WizardStep, label: "Budget" },
    { num: 2 as WizardStep, label: "Lifestyle" },
    { num: 3 as WizardStep, label: "Preferences" },
  ];

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors
                ${current > s.num
                  ? "bg-blue-600 text-white"       // completed
                  : current === s.num
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"  // active
                    : "bg-slate-100 text-slate-400"}` // upcoming
              }
            >
              {current > s.num ? (
                /* Completed: show tick */
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : s.num}
            </div>
            <span className={`mt-1.5 text-xs font-medium ${current === s.num ? "text-blue-600" : "text-slate-400"}`}>
              {s.label}
            </span>
          </div>
          {/* Connector line between steps */}
          {i < steps.length - 1 && (
            <div className={`mb-5 h-0.5 w-16 sm:w-24 ${current > s.num ? "bg-blue-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Loading animation
// ─────────────────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      {/* Animated spinner */}
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      <h3 className="mt-6 text-lg font-bold text-slate-900">Analysing your preferences…</h3>
      <p className="mt-2 max-w-xs text-center text-sm text-slate-500">
        We&apos;re matching your preferences with BYD, Tesla, and Omoda options, including live inventory when available.
      </p>
      {/* Animated loading bars for style */}
      <div className="mt-8 w-64 space-y-2">
        {["Affordability", "Range & Usage", "Charging Fit", "Family Suitability"].map((label) => (
          <div key={label} className="flex items-center gap-3 text-xs text-slate-400">
            <span className="w-28 shrink-0 text-right">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full animate-pulse rounded-full bg-blue-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Budget
// ─────────────────────────────────────────────────────────────────────────────
type UpdateFn = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;

function StepBudget({ prefs, update }: { prefs: UserPreferences; update: UpdateFn }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">Your Budget</h2>
      <p className="mt-1 text-sm text-slate-500">
        Tell us your financial picture so we can find EVs within your reach.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <CurrencyInput
          label="Monthly Income"
          hint="Your take-home pay per month"
          value={prefs.monthlyIncome}
          onChange={(v) => update("monthlyIncome", v)}
          min={500}
          max={50000}
        />
        <CurrencyInput
          label="Total Car Budget"
          hint="Maximum you'd spend on the car"
          value={prefs.totalBudget}
          onChange={(v) => update("totalBudget", v)}
          min={10000}
          max={150000}
        />
        <CurrencyInput
          label="Down Payment"
          hint="Upfront deposit you can put down"
          value={prefs.downPayment}
          onChange={(v) => update("downPayment", v)}
          min={0}
          max={prefs.totalBudget - 1000}
        />
        <CurrencyInput
          label="Target Monthly EMI"
          hint="Ideal monthly finance payment"
          value={prefs.preferredMonthlyEmi}
          onChange={(v) => update("preferredMonthlyEmi", v)}
          min={100}
          max={5000}
        />
      </div>

      {/* Live EMI preview */}
      <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 border border-blue-100">
        <span className="font-semibold">Loan amount: </span>
        £{Math.max(0, prefs.totalBudget - prefs.downPayment).toLocaleString()}
        {" "}at 8% p.a. over 5 years. Scores reward staying within your EMI target.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Lifestyle
// ─────────────────────────────────────────────────────────────────────────────
function StepLifestyle({ prefs, update }: { prefs: UserPreferences; update: UpdateFn }) {
  const usageOptions: { value: UsageType; label: string; icon: string; desc: string }[] = [
    { value: "city",    label: "City",    icon: "🏙️", desc: "Mostly urban, short daily trips" },
    { value: "mixed",   label: "Mixed",   icon: "🛣️", desc: "A blend of city and countryside" },
    { value: "highway", label: "Highway", icon: "🚗", desc: "Long motorway journeys regularly" },
  ];

  const chargingOptions: { value: ChargingAccess; label: string; icon: string; desc: string }[] = [
    { value: "home",   label: "Home Charger",    icon: "🏠", desc: "I can install a wallbox at home" },
    { value: "public", label: "Public Network",  icon: "⚡", desc: "I rely on public charge points" },
    { value: "none",   label: "Not Sure Yet",    icon: "❓", desc: "No dedicated charging access" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">Your Lifestyle</h2>
      <p className="mt-1 text-sm text-slate-500">
        Help us match the right range, space, and charging to your real life.
      </p>

      {/* Usage type */}
      <div className="mt-6">
        <label className="mb-2 block text-sm font-semibold text-slate-700">How do you mainly drive?</label>
        <div className="grid grid-cols-3 gap-3">
          {usageOptions.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              desc={opt.desc}
              selected={prefs.usageType === opt.value}
              onClick={() => update("usageType", opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Family size */}
      <div className="mt-6">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Family / group size
          <span className="ml-2 text-blue-600">{prefs.familySize} {prefs.familySize === 1 ? "person" : "people"}</span>
        </label>
        <input
          type="range"
          min={1}
          max={7}
          step={1}
          value={prefs.familySize}
          onChange={(e) => update("familySize", Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>1 person</span>
          <span>7+ people</span>
        </div>
      </div>

      {/* Charging access */}
      <div className="mt-6">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Charging access</label>
        <div className="grid grid-cols-3 gap-3">
          {chargingOptions.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              desc={opt.desc}
              selected={prefs.chargingAccess === opt.value}
              onClick={() => update("chargingAccess", opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Body type preference
// ─────────────────────────────────────────────────────────────────────────────
function StepPreference({ prefs, update }: { prefs: UserPreferences; update: UpdateFn }) {
  const bodyOptions: { value: BodyType; label: string; icon: string; desc: string }[] = [
    { value: "suv",      label: "SUV / Crossover", icon: "🚙", desc: "Taller, more ground clearance" },
    { value: "sedan",    label: "Sedan",           icon: "🚘", desc: "Classic boot, sleek profile" },
    { value: "hatchback",label: "Hatchback",       icon: "🚗", desc: "Compact and easy to park" },
    { value: "any",      label: "No Preference",   icon: "✨", desc: "Show me all body types" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">Body Type</h2>
      <p className="mt-1 text-sm text-slate-500">
        Do you have a preferred style? This acts as a bonus filter — you&apos;ll still see other types if they score highly.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {bodyOptions.map((opt) => (
          <OptionCard
            key={opt.value}
            icon={opt.icon}
            label={opt.label}
            desc={opt.desc}
            selected={prefs.preferredBodyType === opt.value}
            onClick={() => update("preferredBodyType", opt.value)}
          />
        ))}
      </div>

      {/* Summary of all choices before final submit */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Your summary</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <SummaryRow label="Budget"    value={`£${prefs.totalBudget.toLocaleString()}`} />
          <SummaryRow label="Down"      value={`£${prefs.downPayment.toLocaleString()}`} />
          <SummaryRow label="EMI target" value={`£${prefs.preferredMonthlyEmi}/mo`} />
          <SummaryRow label="Income"    value={`£${prefs.monthlyIncome.toLocaleString()}/mo`} />
          <SummaryRow label="Usage"     value={prefs.usageType} className="capitalize" />
          <SummaryRow label="Family"    value={`${prefs.familySize} people`} />
          <SummaryRow label="Charging"  value={prefs.chargingAccess} className="capitalize" />
          <SummaryRow label="Body"      value={prefs.preferredBodyType === "any" ? "Any" : prefs.preferredBodyType} className="capitalize" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Numeric input with a £ prefix symbol */
function CurrencyInput({
  label, hint, value, onChange, min, max,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <p className="mb-1.5 text-xs text-slate-400">{hint}</p>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <span className="flex items-center bg-slate-50 px-3 text-sm font-medium text-slate-500 border-r border-slate-200">
          £
        </span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none"
        />
      </div>
    </div>
  );
}

/** Clickable card for radio-like single-selection */
function OptionCard({
  icon, label, desc, selected, onClick,
}: {
  icon: string;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all
        ${selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className={`text-xs font-bold ${selected ? "text-blue-700" : "text-slate-800"}`}>{label}</span>
      <span className="text-[10px] leading-tight text-slate-400">{desc}</span>
    </button>
  );
}

/** Two-column summary row for the final review step */
function SummaryRow({
  label, value, className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <>
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold text-slate-800 ${className}`}>{value}</span>
    </>
  );
}
