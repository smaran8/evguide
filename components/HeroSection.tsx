"use client";

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking/client";
import type { EVModel } from "@/types";

const BUDGETS = [
  "Under £20,000",
  "£20,000 – £30,000",
  "£30,000 – £40,000",
  "£40,000 – £50,000",
  "Above £50,000",
];

type Props = { models: EVModel[] };

function toBudgetRange(label: string): { min: number | null; max: number | null } {
  switch (label) {
    case "Under £20,000":
      return { min: 0, max: 20000 };
    case "£20,000 – £30,000":
      return { min: 20000, max: 30000 };
    case "£30,000 – £40,000":
      return { min: 30000, max: 40000 };
    case "£40,000 – £50,000":
      return { min: 40000, max: 50000 };
    case "Above £50,000":
      return { min: 50000, max: null };
    default:
      return { min: null, max: null };
  }
}

export default function HeroSection({ models }: Props) {
  const brands = [...new Set(models.map((m) => m.brand))];
  const [brand, setBrand] = useState("");
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [budget, setBudget] = useState("");

  const filteredModels = brand ? models.filter((m) => m.brand === brand) : models;
  const featured = models.find((m) => m.id === modelId) ?? models[0];
  const emiMonthly = featured ? Math.round((featured.price * 0.8) / 60) : 0;
  const compareHref = modelId ? `/compare?carA=${modelId}` : "/compare";

  if (!featured) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -left-48 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">

          {/* ── Left column ── */}
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              UK&apos;s #1 EV Comparison Platform
            </span>

            <h1 className="mt-5 text-5xl font-extrabold leading-tight tracking-tight lg:text-6xl">
              Find the Best{" "}
              <span className="text-blue-400">Electric Car</span>
              {" "}&amp; Monthly Deal
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-blue-100/75">
              Compare specs, finance deals, and real owner reviews for every
              major EV on the UK market — all in one place.
            </p>

            {/* Dropdowns */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <select
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setModelId(""); }}
                className="rounded-xl bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="rounded-xl bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Models</option>
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.brand} {m.model}</option>
                ))}
              </select>

              <select
                value={budget}
                onChange={(e) => {
                  const nextBudget = e.target.value;
                  setBudget(nextBudget);

                  const range = toBudgetRange(nextBudget);
                  void trackEvent({
                    eventType: "price_filter_used",
                    eventValue: {
                      filter_source: "hero_budget_dropdown",
                      budget_label: nextBudget || "Any Budget",
                      budget_min: range.min,
                      budget_max: range.max,
                    },
                  });
                }}
                className="rounded-xl bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Any Budget</option>
                {BUDGETS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={compareHref}
                className="rounded-xl bg-blue-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-400"
              >
                Compare Now →
              </Link>
              <Link
                href="/finance"
                className="rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Check EMI
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-sm text-blue-200/60">
              <span>✓ 100% Free</span>
              <span>✓ No registration needed</span>
              <span>✓ Updated daily</span>
            </div>
          </div>

          {/* ── Right column: featured EV card ── */}
          <div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  Featured EV
                </p>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  Best Value
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-bold">
                {featured.brand} {featured.model}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-blue-100/60">
                {featured.description}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Range", value: `${featured.rangeKm} km` },
                  { label: "Battery", value: `${featured.batteryKWh} kWh` },
                  { label: "0–100", value: featured.acceleration },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-xs text-blue-300">{stat.label}</p>
                    <p className="mt-1 text-sm font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* EMI strip */}
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                <div>
                  <p className="text-xs text-blue-300">Est. monthly from</p>
                  <p className="text-2xl font-extrabold">
                    £{emiMonthly.toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-blue-200">/mo</span>
                  </p>
                  <p className="text-xs text-blue-300/70">80% LTV · 60 months · ~6.9% APR</p>
                </div>
                <Link
                  href="/finance"
                  className="shrink-0 rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-400"
                >
                  Calculate →
                </Link>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <p className="text-sm text-blue-200">Price</p>
                <p className="text-xl font-bold">£{featured.price.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
