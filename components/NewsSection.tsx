"use client";

import { useMemo, useState } from "react";
import type { EVNewsItem } from "@/lib/news";

type NewsSectionProps = {
  items: EVNewsItem[];
};

const tabs = ["All", "Tesla", "BYD", "Battery", "Charging"];

export default function NewsSection({ items }: NewsSectionProps) {
  const [activeTab, setActiveTab] = useState("All");

  const filteredItems = useMemo(() => {
    if (activeTab === "All") return items;
    return items.filter((item) => item.category === activeTab);
  }, [items, activeTab]);

  const featuredItem = filteredItems[0];
  const secondaryItems = filteredItems.slice(1, 5);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-blue-600">Trending EV News</p>
          <h2 className="mt-2 text-4xl font-bold text-slate-900">
            Latest EV tech, battery innovation, and charging updates
          </h2>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="text-lg font-bold text-red-700">
              No live news is loading.
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Check terminal logs for ENV CHECK, GNEWS STATUS, and GNEWS RAW RESPONSE.
            </p>
          </div>
        ) : (
          <>
            {featuredItem && (
              <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img
                      src={featuredItem.image}
                      alt={featuredItem.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {featuredItem.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {featuredItem.publishedAt}
                      </span>
                    </div>

                    <h3 className="mt-4 text-3xl font-bold text-slate-900">
                      {featuredItem.title}
                    </h3>

                    <p className="mt-4 text-base text-slate-600">
                      {featuredItem.summary}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-500">
                        Source: {featuredItem.source}
                      </p>

                      {featuredItem.url ? (
  <a
    href={featuredItem.url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
  >
    Read more
  </a>
) : (
  <span className="inline-flex items-center rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
    Link unavailable
  </span>
)}
                    </div>
                  </div>
                </article>

                <div className="grid gap-4">
                  {secondaryItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-blue-600">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.publishedAt}
                        </span>
                      </div>

                      <h4 className="mt-3 text-lg font-semibold text-slate-900">
                        {item.title}
                      </h4>

                      <p className="mt-2 text-sm text-slate-600">
                        {item.summary}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">{item.source}</p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600"
                        >
                          Read more →
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}