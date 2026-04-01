"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EVModel } from "@/types";

type BestSellingSectionProps = {
  models: EVModel[];
};

export default function BestSellingSection({
  models,
}: BestSellingSectionProps) {
  const topModels = models.slice(0, 10);
  const [page, setPage] = useState(0);

  const cardsPerPage = 4;
  const totalPages = Math.ceil(topModels.length / cardsPerPage);

  const visibleModels = useMemo(() => {
    const start = page * cardsPerPage;
    const end = start + cardsPerPage;
    return topModels.slice(start, end);
  }, [page, topModels]);

  const handlePrev = () => {
    setPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600">Most Loved EVs</p>
            <h2 className="mt-2 text-4xl font-bold text-slate-900">
              Best-selling EVs and why people love them
            </h2>
            <p className="mt-3 text-slate-600">
              Explore the most popular EVs side by side and browse them in sets.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={page === 0}
              className={`rounded-full border px-4 py-3 text-sm font-semibold transition ${
                page === 0
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-600 hover:text-blue-600"
              }`}
            >
              ←
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={page === totalPages - 1}
              className={`rounded-full border px-4 py-3 text-sm font-semibold transition ${
                page === totalPages - 1
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-600 hover:text-blue-600"
              }`}
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {visibleModels.map((model, index) => {
            const rank = page * cardsPerPage + index + 1;

            return (
              <article
                key={model.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <img
                    src={model.heroImage}
                    alt={`${model.brand} ${model.model}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                    #{rank}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {model.brand} {model.model}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        £{model.price.toLocaleString()}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {model.rangeKm} km
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {model.description}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Best for</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {model.bestFor}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Battery</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {model.batteryKWh} kWh
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-700">
                      Why people love it
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-700">
                      {model.lovedReason}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href="/compare"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Compare
                    </Link>

                    <Link
                      href="/finance"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Finance
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPage(index)}
              className={`h-2.5 rounded-full transition ${
                page === index ? "w-8 bg-blue-600" : "w-2.5 bg-slate-300"
              }`}
              aria-label={`Go to EV page ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}