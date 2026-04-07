"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/tracking/client";
import type {
  PersonalizedVehicleCard,
  VehicleListingFilters,
  VehicleListingSegment,
  VehicleTier,
} from "@/types";

type Props = {
  vehicles: PersonalizedVehicleCard[];
  initialSegment: VehicleListingSegment;
  initialPreferredTier: VehicleTier;
};

const SECTION_LABELS: Record<VehicleTier, string> = {
  affordable: "Affordable Picks",
  mid: "Mid Range Best Value",
  premium: "Premium Picks",
};

function filterVehicles(
  vehicles: PersonalizedVehicleCard[],
  filters: VehicleListingFilters,
): PersonalizedVehicleCard[] {
  return vehicles.filter((vehicle) => {
    if (filters.budgetMax !== null && vehicle.price > filters.budgetMax) return false;
    if (filters.rangeMin !== null && vehicle.rangeKm < filters.rangeMin) return false;
    if (filters.brand !== null && vehicle.brand !== filters.brand) return false;
    if (filters.emiMax !== null && vehicle.estimatedEmi > filters.emiMax) return false;
    return true;
  });
}

function VehicleCard({ vehicle }: { vehicle: PersonalizedVehicleCard }) {
  function handleVehicleView() {
    void trackEvent({
      eventType: "vehicle_view",
      carId: vehicle.id,
      eventValue: {
        brand: vehicle.brand,
        model: vehicle.model,
        vehicle_tier: vehicle.tier,
      },
    });
  }

  function handleCompareClick() {
    void trackEvent({
      eventType: "compare_clicked",
      carId: vehicle.id,
      eventValue: {
        source: "vehicles_listing",
        vehicle_tier: vehicle.tier,
      },
    });
  }

  function handleEmiClick() {
    void trackEvent({
      eventType: "emi_used",
      carId: vehicle.id,
      eventValue: {
        source: "vehicles_listing_card",
        estimated_monthly_emi: vehicle.estimatedEmi,
        vehicle_tier: vehicle.tier,
      },
    });
  }

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-200">
      <Link href={`/cars/${vehicle.id}`} onClick={handleVehicleView} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
          <Image
            src={vehicle.heroImage}
            alt={`${vehicle.brand} ${vehicle.model}`}
            fill
            unoptimized
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 backdrop-blur">
              {vehicle.tier}
            </span>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {vehicle.rangeKm} km
            </span>
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            {vehicle.brand}
          </p>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">{vehicle.model}</h2>
            <p className="text-lg font-extrabold text-slate-900">
              GBP {vehicle.price.toLocaleString()}
            </p>
          </div>
          <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {vehicle.whyRecommended}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Range</p>
            <p className="mt-1 font-semibold text-slate-900">{vehicle.rangeKm} km</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">EMI est.</p>
            <p className="mt-1 font-semibold text-slate-900">GBP {vehicle.estimatedEmi}/mo</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Battery</p>
            <p className="mt-1 font-semibold text-slate-900">{vehicle.batteryKWh} kWh</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/cars/${vehicle.id}`}
            onClick={handleVehicleView}
            className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            View details
          </Link>
          <Link
            href={`/compare?carA=${vehicle.id}`}
            onClick={handleCompareClick}
            className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Compare
          </Link>
        </div>

        <Link
          href={`/finance?car=${vehicle.id}`}
          onClick={handleEmiClick}
          className="block rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Check EMI
        </Link>
      </div>
    </article>
  );
}

function ListingSection({
  title,
  description,
  vehicles,
}: {
  title: string;
  description: string;
  vehicles: PersonalizedVehicleCard[];
}) {
  if (vehicles.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <p className="text-sm font-medium text-slate-400">{vehicles.length} models</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </section>
  );
}

export default function SmartVehicleListing({
  vehicles,
  initialSegment,
  initialPreferredTier,
}: Props) {
  const [filters, setFilters] = useState<VehicleListingFilters>({
    budgetMax: null,
    rangeMin: null,
    brand: null,
    emiMax: null,
  });
  const deferredFilters = useDeferredValue(filters);

  const brands = useMemo(
    () => [...new Set(vehicles.map((vehicle) => vehicle.brand))].sort((a, b) => a.localeCompare(b)),
    [vehicles],
  );

  useEffect(() => {
    const activeFilterCount = Object.values(filters).filter((value) => value !== null).length;
    if (activeFilterCount === 0) return;

    void trackEvent({
      eventType: "filter_used",
      eventValue: {
        budget_max: filters.budgetMax,
        range_min: filters.rangeMin,
        brand: filters.brand,
        emi_max: filters.emiMax,
        source: "vehicles_listing",
      },
    });

    if (filters.emiMax !== null) {
      void trackEvent({
        eventType: "emi_used",
        eventValue: {
          source: "vehicles_listing_filter",
          estimated_monthly_emi: filters.emiMax,
        },
      });
    }
  }, [filters]);

  const filteredVehicles = useMemo(
    () =>
      filterVehicles(
        [...vehicles].sort((a, b) => b.recommendationScore - a.recommendationScore),
        deferredFilters,
      ),
    [deferredFilters, vehicles],
  );

  const recommended = filteredVehicles.slice(0, 4);
  const grouped = {
    affordable: filteredVehicles.filter((vehicle) => vehicle.tier === "affordable"),
    mid: filteredVehicles.filter((vehicle) => vehicle.tier === "mid"),
    premium: filteredVehicles.filter((vehicle) => vehicle.tier === "premium"),
  };

  return (
    <div className="space-y-12">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-blue-50/50 px-6 py-6 lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Smart Listing Mode
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Personalized around your browsing
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Segment: <span className="font-semibold text-slate-700">{initialSegment}</span>
              {" | "}
              Preferred tier:{" "}
              <span className="font-semibold text-slate-700">{initialPreferredTier}</span>
            </p>
          </div>

          <label className="text-sm text-slate-600">
            Budget
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              value={filters.budgetMax ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  budgetMax: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">Any budget</option>
              <option value="30000">Up to GBP 30k</option>
              <option value="40000">Up to GBP 40k</option>
              <option value="50000">Up to GBP 50k</option>
              <option value="70000">Up to GBP 70k</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Range
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              value={filters.rangeMin ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  rangeMin: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">Any range</option>
              <option value="300">300+ km</option>
              <option value="400">400+ km</option>
              <option value="500">500+ km</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Brand
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              value={filters.brand ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  brand: event.target.value || null,
                }))
              }
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            EMI
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              value={filters.emiMax ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  emiMax: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">Any EMI</option>
              <option value="350">Up to GBP 350/mo</option>
              <option value="500">Up to GBP 500/mo</option>
              <option value="650">Up to GBP 650/mo</option>
              <option value="800">Up to GBP 800/mo</option>
            </select>
          </label>
        </div>
      </div>

      <ListingSection
        title="Recommended For You"
        description="Behavior-driven picks ranked from your browsing, compare, and EMI activity."
        vehicles={recommended}
      />

      <ListingSection
        title={SECTION_LABELS.affordable}
        description="Lower-entry EVs prioritized for new users and finance-sensitive journeys."
        vehicles={grouped.affordable}
      />

      <ListingSection
        title={SECTION_LABELS.mid}
        description="Best value picks when your behavior suggests active comparison and shortlist building."
        vehicles={grouped.mid}
      />

      <ListingSection
        title={SECTION_LABELS.premium}
        description="Higher-spec EVs for users browsing long-range or premium options."
        vehicles={grouped.premium}
      />
    </div>
  );
}
