"use client";

import Link from "next/link";
import Image from "next/image";
import { useIntentProfile } from "@/lib/personalization/use-intent-profile";
import { evModels } from "@/data/evModels";
import type { UserIntentProfileRow } from "@/types";
import type { EVModel } from "@/types";

/** Simple monthly EMI estimate — same formula used elsewhere in the site. */
function estimateMonthlyEmi(price: number): number {
  return Math.round((price * 0.8) / 60);
}

// ─── Sub-variants ─────────────────────────────────────────────────────────────

function CasualCard({ car }: { car: EVModel }) {
  return (
    <Card>
      <CarImage car={car} />
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <Badge className="bg-slate-100 text-slate-600">Still exploring</Badge>
          <h3 className="mt-3 text-xl font-bold text-slate-900">
            {car.brand} {car.model}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            You&apos;ve viewed this car before. See how it stacks up.
          </p>
          <p className="mt-2 text-sm font-semibold text-blue-600">
            From £{car.price.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/cars/${car.id}`}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            View Details
          </Link>
          <Link
            href={`/compare?carA=${car.id}`}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600"
          >
            Compare It
          </Link>
        </div>
      </div>
    </Card>
  );
}

function ResearchCard({ car }: { car: EVModel }) {
  const emi = estimateMonthlyEmi(car.price);
  return (
    <Card>
      <CarImage car={car} />
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <Badge className="bg-blue-50 text-blue-600">Your top pick so far</Badge>
          <h3 className="mt-3 text-xl font-bold text-slate-900">
            {car.brand} {car.model}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            You&apos;ve come back to this car more than once.
          </p>
          <p className="mt-2 inline-flex items-baseline gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            <span className="text-xs font-normal text-emerald-600">Est.</span>
            ~£{emi.toLocaleString()}/mo
            <span className="text-xs font-normal text-emerald-600">on 60-month finance</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/finance?car=${car.id}`}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Get My EMI
          </Link>
          <Link
            href={`/compare?carA=${car.id}`}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600"
          >
            Compare
          </Link>
        </div>
      </div>
    </Card>
  );
}

function BuyerCard({ car }: { car: EVModel }) {
  return (
    <Card highlight>
      <CarImage car={car} />
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            You look ready
          </Badge>
          <h3 className="mt-3 text-xl font-bold text-slate-900">
            {car.brand} {car.model}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Don&apos;t let this one pass. Book a test drive or lock in your finance today.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            From £{car.price.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href={`/appointment?car=${car.id}`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
          >
            Book Test Drive →
          </Link>
          <div className="flex gap-2">
            <Link
              href={`/finance?car=${car.id}`}
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Apply for Finance
            </Link>
            <Link
              href={`/appointment?car=${car.id}&intent=reserve`}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600"
            >
              Reserve This EV
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-3xl border sm:flex-row ${
        highlight
          ? "border-blue-200 shadow-lg shadow-blue-100"
          : "border-slate-200 shadow-sm"
      } bg-white`}
    >
      {children}
    </div>
  );
}

function CarImage({ car }: { car: EVModel }) {
  return (
    <div className="relative h-52 w-full shrink-0 sm:h-auto sm:w-64">
      <Image
        src={car.heroImage}
        alt={`${car.brand} ${car.model}`}
        fill
        unoptimized
        sizes="(min-width: 640px) 256px, 100vw"
        className="object-cover"
      />
    </div>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-6">
          <p className="text-sm font-semibold text-blue-600">Recommended for you</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Based on what you&apos;ve explored
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

function RecommendedCard({
  profile,
}: {
  profile: UserIntentProfileRow;
}) {
  const carId = profile.strongest_interest_car_id;
  const car = carId ? evModels.find((m) => m.id === carId) ?? null : null;

  if (!car) return null;

  if (profile.user_type === "buyer") return <BuyerCard car={car} />;
  if (profile.user_type === "research") return <ResearchCard car={car} />;
  return <CasualCard car={car} />;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * "Recommended for you" section.
 * Renders nothing when:
 *  - The profile has not loaded yet (no layout shift, no spinner)
 *  - There is no strongest_interest_car_id to highlight
 *  - The car_id doesn't match a known local EV (graceful degradation)
 */
export default function RecommendedForYou() {
  const { profile, loading } = useIntentProfile();

  // Do not render at all until the profile is known.
  // This avoids both flashing a placeholder and pushing content down.
  if (loading || !profile || !profile.strongest_interest_car_id) return null;

  return (
    <SectionShell>
      <RecommendedCard profile={profile} />
    </SectionShell>
  );
}
