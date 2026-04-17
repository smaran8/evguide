import { Trophy, PoundSterling, Gauge, MapPin, Building2 } from "lucide-react";
import type { EVModel } from "@/types";
import { applyEvEnrichment } from "@/data/evEnrichment";

interface Props {
  modelA: EVModel;
  modelB: EVModel;
}

function computeOverallScore(v: EVModel): number {
  let score = 0;
  // Affordability (lower price = more points)
  score += Math.max(0, 40 - Math.round(v.price / 2000));
  // Range
  score += Math.min(25, Math.round(v.rangeKm / 20));
  // Battery efficiency
  if (v.batteryKWh > 0 && v.rangeKm > 0) {
    const kmPerKwh = v.rangeKm / v.batteryKWh;
    score += Math.min(15, Math.round(kmPerKwh * 2));
  }
  // Performance
  const accel = parseFloat(String(v.acceleration).match(/([0-9.]+)/)?.[1] ?? "10");
  score += Math.max(0, 20 - Math.round(accel * 2));
  return Math.max(10, Math.min(99, score));
}

function parseAccel(s: string): number {
  return parseFloat(String(s).match(/([0-9.]+)/)?.[1] ?? "99") || 99;
}

type CategoryWinner = {
  icon: React.ReactNode;
  label: string;
  winner: EVModel | null;
  reason: string;
};

export default function PremiumCompareInsights({ modelA, modelB }: Props) {
  const eA = applyEvEnrichment(modelA);
  const eB = applyEvEnrichment(modelB);

  const scoreA = computeOverallScore(modelA);
  const scoreB = computeOverallScore(modelB);

  const overallWinner = scoreA >= scoreB ? modelA : modelB;
  const overallLoser  = scoreA >= scoreB ? modelB : modelA;
  const scoreDiff = Math.abs(scoreA - scoreB);

  const overallReason =
    scoreDiff <= 3
      ? "These two are very closely matched — either is a strong choice depending on your priorities."
      : overallWinner.price < overallLoser.price
      ? `Better value at £${(overallLoser.price - overallWinner.price).toLocaleString()} less, with comparable range and daily usability.`
      : overallWinner.rangeKm > overallLoser.rangeKm
      ? `Stronger real-world range gives more day-to-day confidence without range anxiety.`
      : `Wins on overall balance of cost, range, and performance across the scorecard.`;

  const budgetWinner: EVModel | null =
    modelA.price < modelB.price ? modelA
    : modelB.price < modelA.price ? modelB
    : null;

  const rangeWinner: EVModel | null =
    (eA.realWorldRangeMiles ?? 0) > (eB.realWorldRangeMiles ?? 0) ? modelA
    : (eB.realWorldRangeMiles ?? 0) > (eA.realWorldRangeMiles ?? 0) ? modelB
    : null;

  const cityWinner: EVModel | null = (() => {
    // City: smaller battery (lighter, cheaper to charge), lower price
    const cityScoreA = (1 / modelA.batteryKWh) * 10000 + (1 / modelA.price) * 100000;
    const cityScoreB = (1 / modelB.batteryKWh) * 10000 + (1 / modelB.price) * 100000;
    if (cityScoreA === cityScoreB) return null;
    return cityScoreA > cityScoreB ? modelA : modelB;
  })();

  const perfWinner: EVModel | null = (() => {
    const aA = parseAccel(modelA.acceleration);
    const aB = parseAccel(modelB.acceleration);
    if (aA === aB) return null;
    return aA < aB ? modelA : modelB;
  })();

  const categories: CategoryWinner[] = [
    {
      icon: <PoundSterling className="h-5 w-5 text-emerald-600" />,
      label: "Best for Budget",
      winner: budgetWinner,
      reason: budgetWinner
        ? `£${Math.abs(modelA.price - modelB.price).toLocaleString()} cheaper to buy — lower monthly payments too.`
        : "Both vehicles are priced the same.",
    },
    {
      icon: <MapPin className="h-5 w-5 text-blue-600" />,
      label: "Best for Range",
      winner: rangeWinner,
      reason: rangeWinner
        ? `~${Math.abs(Math.round((eA.realWorldRangeMiles ?? modelA.rangeKm * 0.51) - (eB.realWorldRangeMiles ?? modelB.rangeKm * 0.51)))} more real-world miles per charge.`
        : "Essentially the same real-world range.",
    },
    {
      icon: <Building2 className="h-5 w-5 text-violet-600" />,
      label: "Best for City Driving",
      winner: cityWinner,
      reason: cityWinner
        ? "More efficient in stop-start traffic — lower running cost per urban mile."
        : "Both are equally well-suited to city use.",
    },
    {
      icon: <Gauge className="h-5 w-5 text-rose-600" />,
      label: "Best for Performance",
      winner: perfWinner,
      reason: perfWinner
        ? `Quicker to 100 km/h by ${Math.abs(parseAccel(modelA.acceleration) - parseAccel(modelB.acceleration)).toFixed(1)}s.`
        : "Both accelerate identically.",
    },
  ];

  return (
    <section className="bg-white py-12 border-y border-[#E5E7EB]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Section label */}
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1FBF9F]">Verdict</p>
        <h2 className="mt-1 text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Who wins?</h2>

        {/* Overall winner banner */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#1FBF9F]/30 bg-gradient-to-r from-[#E8F8F5] to-white">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1FBF9F] shadow-md">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1FBF9F]">Overall Winner</p>
              <p className="mt-0.5 text-xl font-extrabold text-[#1A1A1A]">
                {overallWinner.brand} {overallWinner.model}
              </p>
              <p className="mt-1 text-sm text-[#4B5563]">{overallReason}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-[#9CA3AF]">Score</p>
              <p className="text-3xl font-black text-[#1FBF9F]">
                {scoreA >= scoreB ? scoreA : scoreB}
                <span className="text-base font-semibold text-[#9CA3AF]">/99</span>
              </p>
            </div>
          </div>
        </div>

        {/* Category winners */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <div
              key={cat.label}
              className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAF9] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm border border-[#E5E7EB]">
                  {cat.icon}
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#374151]">
                  {cat.label}
                </p>
              </div>
              {cat.winner ? (
                <>
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    {cat.winner.brand} {cat.winner.model}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#6B7280]">{cat.reason}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#6B7280]">Tied</p>
                  <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{cat.reason}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
