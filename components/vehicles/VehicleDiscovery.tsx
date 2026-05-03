"use client";

import { useDeferredValue, useMemo, useState } from "react";
import PremiumFilterSidebar from "@/components/vehicles/PremiumFilterSidebar";
import PremiumVehicleCard from "@/components/vehicles/PremiumVehicleCard";
import SectionBlock from "@/components/vehicles/SectionBlock";
import VehicleSort from "@/components/vehicles/VehicleSort";
import { filterVehicles, defaultFilters } from "@/lib/vehicles/filter";
import { sortVehicles } from "@/lib/vehicles/sort";
import type {
  AllVehiclesFilters,
  PersonalizedVehicleCard,
  VehicleListingSegment,
  VehicleTier,
} from "@/types";
import { Search, Flame, PiggyBank, Sparkles, Diamond } from "lucide-react";

const TIERS: VehicleTier[] = ["affordable", "mid", "premium"];

type Props = {
  vehicles: PersonalizedVehicleCard[];
  segment: VehicleListingSegment;
};

export default function VehicleDiscovery({ vehicles }: Props) {
  const [filters, setFilters] = useState<AllVehiclesFilters>(defaultFilters);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const activeFilters: AllVehiclesFilters = useMemo(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch]
  );

  const filtered = useMemo(
    () => sortVehicles(filterVehicles(vehicles, activeFilters), activeFilters.sort),
    [vehicles, activeFilters]
  );

  const byTier = useMemo(() => {
    return TIERS.reduce<Record<VehicleTier, PersonalizedVehicleCard[]>>(
      (acc, tier) => {
        acc[tier] = filtered.filter((v) => v.tier === tier);
        return acc;
      },
      { affordable: [], mid: [], premium: [] }
    );
  }, [filtered]);

  const recommendedMatches = useMemo(() => {
    return filtered
      .filter((v) => v.recommendationScore >= 70)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 3);
  }, [filtered]);

  const hasResults = filtered.length > 0;

  function handleFiltersChange(next: AllVehiclesFilters) {
    setFilters(next);
  }

  const filtersForPanel = { ...filters, search };

  return (
    <div className="mx-auto min-h-screen max-w-screen-2xl bg-[#F8FAF9] px-4 pb-24 font-sans text-[#1A1A1A] sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="relative mb-10 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white px-6 py-10 shadow-sm sm:px-10">
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-8">
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">
              Browse {vehicles.length} electric cars
            </h1>
            <p className="mt-1 text-sm text-[#4B5563]">Real-world range, estimated monthly cost, match signal, and clear deal guidance.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto] xl:items-center">
            <div className="relative w-full max-w-xl group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#6B7280] group-focus-within:text-[#1FBF9F] transition-colors" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand, range, body type..."
                className="block w-full rounded-full border border-[#E5E7EB] bg-[#F8FAF9] py-3 pl-11 pr-5 text-sm font-medium text-[#1A1A1A] placeholder-[#6B7280] transition-all focus:border-[#1FBF9F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1F2EB]"
              />
            </div>
            <div className="min-w-[220px]">
              <VehicleSort
                value={filters.sort}
                onChange={(nextSort) => handleFiltersChange({ ...filters, sort: nextSort })}
                totalCount={vehicles.length}
                filteredCount={filtered.length}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="relative items-start lg:grid lg:grid-cols-[300px_1fr] lg:gap-12">
        <aside className="sticky top-28 z-20">
          <PremiumFilterSidebar
            filters={filtersForPanel}
            onChange={handleFiltersChange}
            vehicles={vehicles}
          />
        </aside>

        <div className="mt-12 min-h-[50vh] lg:mt-0">
          {!hasResults ? (
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-16 text-center shadow-sm">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F8FAF9]">
                <Search className="h-10 w-10 text-[#6B7280]" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-[#1A1A1A]">No close matches yet</h3>
              <p className="mx-auto mb-8 max-w-md text-[#4B5563]">Try broadening your filters slightly so we can show stronger EV fits instead of forcing a weak shortlist.</p>
              <button
                onClick={() => { setSearch(""); setFilters(defaultFilters); }}
                className="rounded-xl bg-[#1FBF9F] px-8 py-3 font-bold text-white shadow-md transition hover:bg-[#17A589]"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {!activeFilters.search && recommendedMatches.length > 0 && (
                <SectionBlock title="Top picks" icon={<Flame className="w-5 h-5" />}>
                  {recommendedMatches.map(v => <PremiumVehicleCard key={v.id} vehicle={v} />)}
                </SectionBlock>
              )}

              {byTier.affordable.length > 0 && (
                <SectionBlock title="Best value EVs" icon={<PiggyBank className="w-5 h-5" />}>
                  {byTier.affordable.map(v => <PremiumVehicleCard key={v.id} vehicle={v} />)}
                </SectionBlock>
              )}

              {byTier.mid.length > 0 && (
                <SectionBlock title="Mid-range EVs" icon={<Sparkles className="w-5 h-5" />}>
                  {byTier.mid.map(v => <PremiumVehicleCard key={v.id} vehicle={v} />)}
                </SectionBlock>
              )}

              {byTier.premium.length > 0 && (
                <SectionBlock title="Premium EVs" icon={<Diamond className="w-5 h-5" />}>
                  {byTier.premium.map(v => <PremiumVehicleCard key={v.id} vehicle={v} />)}
                </SectionBlock>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
