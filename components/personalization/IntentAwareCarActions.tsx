"use client";

import Link from "next/link";
import { useIntentProfile } from "@/lib/personalization/use-intent-profile";

type Props = {
  carId: string;
  carPrice: number;
  brand: string;
  model: string;
};

/** Simple monthly EMI estimate — same formula used elsewhere in the site. */
function estimateMonthlyEmi(price: number): number {
  return Math.round((price * 0.8) / 60);
}

// ─── State variants ───────────────────────────────────────────────────────────

/**
 * Exactly matches the existing static button layout used in the car detail
 * page, so there is zero layout shift during loading or for new visitors.
 */
function FallbackActions({ carId }: { carId: string }) {
  return (
    <div className="mt-8 flex gap-4">
      <Link
        href={`/compare?carA=${carId}`}
        className="flex-1 rounded-2xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
      >
        Compare This EV
      </Link>
      <Link
        href={`/finance?car=${carId}`}
        className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Finance This EV
      </Link>
    </div>
  );
}

function CasualActions({ carId }: { carId: string }) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      <div className="flex gap-4">
        <Link
          href={`/compare?carA=${carId}`}
          className="flex-1 rounded-2xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          Compare This EV
        </Link>
        <Link
          href={`/finance?car=${carId}`}
          className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Calculate EMI
        </Link>
      </div>
      <p className="text-center text-xs text-slate-400">
        Tip: use Compare to see this EV side by side with others.
      </p>
    </div>
  );
}

function ResearchActions({
  carId,
  carPrice,
}: {
  carId: string;
  carPrice: number;
}) {
  const emi = estimateMonthlyEmi(carPrice);
  return (
    <div className="mt-8 flex flex-col gap-3">
      <div className="flex gap-4">
        <Link
          href={`/compare?carA=${carId}`}
          className="flex-1 rounded-2xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          Compare This EV
        </Link>
        <Link
          href={`/finance?car=${carId}`}
          className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Finance This EV
        </Link>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
        <p className="text-sm text-blue-700">
          Estimated monthly payment{" "}
          <span className="font-bold">~£{emi.toLocaleString()}/mo</span>
          <span className="text-blue-500"> on 60-month finance</span>
        </p>
        <Link
          href={`/finance?car=${carId}`}
          className="mt-1.5 inline-block text-xs font-semibold text-blue-600 hover:underline"
        >
          Customise your deal →
        </Link>
      </div>
    </div>
  );
}

function BuyerActions({
  carId,
  brand,
  model,
}: {
  carId: string;
  brand: string;
  model: string;
}) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      {/* Buyer intent nudge */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
        <p className="text-xs font-semibold text-amber-700">
          You&apos;ve shown strong interest in the {brand} {model}.
        </p>
      </div>

      {/* Primary: Test Drive */}
      <Link
        href={`/appointment?car=${carId}`}
        className="rounded-2xl bg-blue-600 px-6 py-3.5 text-center text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
      >
        Book a Test Drive →
      </Link>

      {/* Secondary row */}
      <div className="flex gap-3">
        <Link
          href={`/finance?car=${carId}`}
          className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Apply for Finance
        </Link>
        <Link
          href={`/appointment?car=${carId}&intent=reserve`}
          className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Reserve This EV
        </Link>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Intent-aware CTA buttons for the car detail page.
 * Matches the exact height and layout of the original static two-button row
 * while loading, then transitions to a personalised set of actions.
 */
export default function IntentAwareCarActions({
  carId,
  carPrice,
  brand,
  model,
}: Props) {
  const { profile, loading } = useIntentProfile();

  if (loading || !profile) {
    return <FallbackActions carId={carId} />;
  }

  if (profile.user_type === "buyer") {
    return <BuyerActions carId={carId} brand={brand} model={model} />;
  }

  if (profile.user_type === "research") {
    return <ResearchActions carId={carId} carPrice={carPrice} />;
  }

  return <CasualActions carId={carId} />;
}
