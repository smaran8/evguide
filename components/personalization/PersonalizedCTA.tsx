"use client";

import Link from "next/link";
import { useIntentProfile } from "@/lib/personalization/use-intent-profile";
import type { UserIntentProfileRow } from "@/types";

// ─── Sub-variants ─────────────────────────────────────────────────────────────

function GenericCTA() {
  return (
    <Section>
      <Eyebrow>Ready to decide?</Eyebrow>
      <h2 className="mt-3 text-4xl font-extrabold leading-tight">
        Compare cars. Estimate EMI. Drive smarter.
      </h2>
      <p className="mt-4 text-lg text-blue-100/80">
        Join thousands of UK buyers who made their EV decision faster with EV Guide.
      </p>
      <ButtonRow>
        <PrimaryButton href="/compare">Compare Cars →</PrimaryButton>
        <SecondaryButton href="/finance">Estimate EMI →</SecondaryButton>
      </ButtonRow>
      <TrustLine />
    </Section>
  );
}

function CasualCTA() {
  return (
    <Section>
      <Eyebrow>Exploring EVs?</Eyebrow>
      <h2 className="mt-3 text-4xl font-extrabold leading-tight">
        Find the EV that fits your life.
      </h2>
      <p className="mt-4 text-lg text-blue-100/80">
        Compare range, price, and real ownership costs across every major UK model — side by side.
      </p>
      <ButtonRow>
        <PrimaryButton href="/compare">Compare EVs →</PrimaryButton>
        <SecondaryButton href="/blog">Read Owner Stories →</SecondaryButton>
      </ButtonRow>
      <TrustLine />
    </Section>
  );
}

function ResearchCTA({ profile }: { profile: UserIntentProfileRow }) {
  const brand = profile.favorite_brand;
  const carId = profile.strongest_interest_car_id;
  const financeHref = carId ? `/finance?car=${carId}` : "/finance";
  const compareHref = carId ? `/compare?carA=${carId}` : "/compare";

  return (
    <Section>
      <Eyebrow>Ready to go deeper?</Eyebrow>
      <h2 className="mt-3 text-4xl font-extrabold leading-tight">
        {brand
          ? `You've been researching ${brand}. Run the real numbers.`
          : "You've been doing your homework. Run the real numbers."}
      </h2>
      <p className="mt-4 text-lg text-blue-100/80">
        Calculate your exact monthly payment and see the best UK finance deals for your shortlist.
      </p>
      <ButtonRow>
        <PrimaryButton href={financeHref}>Calculate My EMI →</PrimaryButton>
        <SecondaryButton href={compareHref}>Compare Finance Deals →</SecondaryButton>
      </ButtonRow>
      <TrustLine />
    </Section>
  );
}

function BuyerCTA({ profile }: { profile: UserIntentProfileRow }) {
  const carId = profile.strongest_interest_car_id;
  const testDriveHref = carId ? `/appointment?car=${carId}` : "/appointment";
  const financeHref = carId ? `/finance?car=${carId}` : "/finance";
  const reserveHref = carId ? `/appointment?car=${carId}&intent=reserve` : "/appointment";

  return (
    <Section>
      <Eyebrow className="border-amber-400/40 bg-amber-400/15 text-amber-300">
        You look ready to buy.
      </Eyebrow>
      <h2 className="mt-3 text-4xl font-extrabold leading-tight">
        Take the next step — today.
      </h2>
      <p className="mt-4 text-lg text-blue-100/80">
        Book a test drive, apply for finance, or reserve your EV before it&apos;s gone.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={testDriveHref}
          className="w-full rounded-xl bg-white px-8 py-3.5 text-center text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50 sm:w-auto"
        >
          Book Test Drive →
        </Link>
        <Link
          href={financeHref}
          className="w-full rounded-xl bg-emerald-500 px-8 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 sm:w-auto"
        >
          Apply for Finance →
        </Link>
        <Link
          href={reserveHref}
          className="w-full rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-center text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20 sm:w-auto"
        >
          Reserve This EV →
        </Link>
      </div>
      <TrustLine />
    </Section>
  );
}

// ─── Primitive layout pieces ──────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">{children}</div>
    </section>
  );
}

function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
        className ??
        "border-blue-400/30 bg-blue-400/15 text-blue-300"
      }`}
    >
      {children}
    </p>
  );
}

function ButtonRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-4">{children}</div>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
    >
      {children}
    </Link>
  );
}

function TrustLine() {
  return (
    <p className="mt-8 text-sm text-blue-200/60">
      Free to use · No registration · Trusted by 10,000+ UK buyers
    </p>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Intent-aware replacement for FinalCTASection.
 * Shows a generic CTA during loading and for visitors with no profile.
 * Progressively reveals a personalised CTA once the profile resolves.
 */
export default function PersonalizedCTA() {
  const { profile, loading } = useIntentProfile();

  // During load, show the generic version so there is no layout shift.
  if (loading || !profile) return <GenericCTA />;

  if (profile.user_type === "buyer") return <BuyerCTA profile={profile} />;
  if (profile.user_type === "research") return <ResearchCTA profile={profile} />;
  return <CasualCTA />;
}
