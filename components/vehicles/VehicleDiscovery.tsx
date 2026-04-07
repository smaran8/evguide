"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import VehicleFilters from "@/components/vehicles/VehicleFilters";
import VehicleSort from "@/components/vehicles/VehicleSort";
import VehicleTierSection from "@/components/vehicles/VehicleTierSection";
import RecommendedVehicles from "@/components/vehicles/RecommendedVehicles";
import FindMyEVDrawer from "@/components/vehicles/FindMyEVDrawer";
import { trackEvent } from "@/lib/tracking/client";
import { filterVehicles, defaultFilters } from "@/lib/vehicles/filter";
import { sortVehicles } from "@/lib/vehicles/sort";
import { decorateWithBadges } from "@/lib/vehicles/recommend";
import type {
  AllVehiclesFilters,
  PersonalizedVehicleCard,
  VehicleListingSegment,
  VehicleTier,
} from "@/types";

const TIERS: VehicleTier[] = ["affordable", "mid", "premium"];

type Props = {
  vehicles: PersonalizedVehicleCard[];
  segment: VehicleListingSegment;
};

export default function VehicleDiscovery({ vehicles, segment }: Props) {
  const [filters, setFilters] = useState<AllVehiclesFilters>(defaultFilters);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const searchTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [findMyEVOpen, setFindMyEVOpen] = useState(false);
  const openFindMyEV = useCallback(() => setFindMyEVOpen(true), []);
  const closeFindMyEV = useCallback(() => setFindMyEVOpen(false), []);

  // Decorate all vehicles with computed display badges once
  const decorated = useMemo(() => decorateWithBadges(vehicles), [vehicles]);

  const activeFilters: AllVehiclesFilters = useMemo(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch],
  );

  const filtered = useMemo(
    () => filterVehicles(decorated, activeFilters),
    [decorated, activeFilters],
  );

  const sorted = useMemo(
    () => sortVehicles(filtered, filters.sort),
    [filtered, filters.sort],
  );

  // Group into tiers
  const byTier = useMemo(() => {
    return TIERS.reduce<Record<VehicleTier, PersonalizedVehicleCard[]>>(
      (acc, tier) => {
        acc[tier] = sorted.filter((v) => v.tier === tier);
        return acc;
      },
      { affordable: [], mid: [], premium: [] },
    );
  }, [sorted]);

  const hasResults = sorted.length > 0;

  // Track page view on mount
  useEffect(() => {
    void trackEvent({ eventType: "page_view", pagePath: "/vehicles" });
  }, []);

  // Track search with debounce
  function handleSearchChange(q: string) {
    setSearch(q);
    if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
    if (q.trim().length >= 2) {
      searchTrackTimer.current = setTimeout(() => {
        void trackEvent({ eventType: "search_used", eventValue: { query: q.trim() } });
      }, 800);
    }
  }

  function handleFiltersChange(next: AllVehiclesFilters) {
    setFilters(next);
  }

  const filtersForPanel = { ...filters, search };

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
      {/* ── Hero section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 px-6 py-16 text-white shadow-2xl sm:px-12 lg:py-20">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10" />
        <div className="pointer-events-none absolute -bottom-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            {vehicles.length} Electric Vehicles
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Find Your Perfect EV
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
            Browse every electric vehicle, filter by what matters to you, and get personalised
            recommendations — all in one place.
          </p>

          {/* Search bar */}
          <div className="relative mx-auto mt-8 max-w-xl">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1 0 4.15 4.15a7.5 7.5 0 0 0 12.5 12.5z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by brand, model, or keyword…"
              className="h-14 w-full rounded-2xl bg-white/10 pl-12 pr-14 text-base text-white placeholder-slate-400 ring-1 ring-white/20 backdrop-blur-md transition focus:bg-white/15 focus:outline-none focus:ring-white/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick tier jump links */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {(["affordable", "mid", "premium"] as VehicleTier[]).map((tier) => (
              <a
                key={tier}
                href={`#tier-${tier}`}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold capitalize text-white/80 transition hover:bg-white/20"
              >
                {tier === "mid" ? "Mid-Range" : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </a>
            ))}
            <button
              type="button"
              onClick={openFindMyEV}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-400"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Find My EV →
            </button>
          </div>
        </div>
      </section>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="mt-8 lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        {/* Sidebar filters */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <VehicleFilters
            filters={filtersForPanel}
            onChange={handleFiltersChange}
            vehicles={decorated}
          />
        </aside>

        {/* Results column */}
        <div className="mt-6 space-y-12 lg:mt-0">
          {/* Sort bar */}
          <VehicleSort
            value={filters.sort}
            onChange={(s) => setFilters((f) => ({ ...f, sort: s }))}
            totalCount={vehicles.length}
            filteredCount={sorted.length}
          />

          {!hasResults ? (
            <EmptyState onReset={() => { setSearch(""); setFilters(defaultFilters()); }} />
          ) : (
            <>
              {/* Recommended strip — only when no active search/filter */}
              {!activeFilters.search && filters.brand === null && (
                <RecommendedVehicles vehicles={decorated} segment={segment} />
              )}

              {/* Tiered sections */}
              {TIERS.map((tier) =>
                byTier[tier].length > 0 ? (
                  <VehicleTierSection key={tier} tier={tier} vehicles={byTier[tier]} />
                ) : null,
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Floating "Find My EV" button ──────────────────────────── */}
      <button
        type="button"
        onClick={openFindMyEV}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl ring-4 ring-blue-600/20 transition hover:bg-blue-700 hover:shadow-2xl active:scale-95"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Find My EV
      </button>

      {/* ── Drawer portal ─────────────────────────────────────────── */}
      <FindMyEVDrawer open={findMyEVOpen} onClose={closeFindMyEV} />
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
      <span className="text-5xl">🔋</span>
      <h3 className="mt-4 text-xl font-bold text-slate-800">No vehicles match your filters</h3>
      <p className="mt-2 text-sm text-slate-500">Try adjusting your search or clear the filters.</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Clear Filters
      </button>
    </div>
  );
}
