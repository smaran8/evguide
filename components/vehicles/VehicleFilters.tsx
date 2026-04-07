"use client";

import { useState, useCallback } from "react";
import { trackEvent } from "@/lib/tracking/client";
import { getUniqueBrands, getUniqueBodyTypes, hasActiveFilters } from "@/lib/vehicles/filter";
import type { AllVehiclesFilters, PersonalizedVehicleCard } from "@/types";

type Props = {
  filters: AllVehiclesFilters;
  onChange: (filters: AllVehiclesFilters) => void;
  vehicles: PersonalizedVehicleCard[];
};

const PRICE_PRESETS = [
  { label: "Under £30k", max: 30000 },
  { label: "Under £40k", max: 40000 },
  { label: "Under £50k", max: 50000 },
  { label: "Any price", max: null },
];

const RANGE_PRESETS = [
  { label: "200+ km", min: 200 },
  { label: "350+ km", min: 350 },
  { label: "450+ km", min: 450 },
  { label: "500+ km", min: 500 },
];

const SEAT_OPTIONS = [2, 4, 5, 7];

export default function VehicleFilters({ filters, onChange, vehicles }: Props) {
  const [open, setOpen] = useState(false);
  const brands = getUniqueBrands(vehicles);
  const bodyTypes = getUniqueBodyTypes(vehicles);
  const active = hasActiveFilters(filters);

  const update = useCallback(
    (patch: Partial<AllVehiclesFilters>) => {
      const next = { ...filters, ...patch };
      onChange(next);
      void trackEvent({
        eventType: "filter_used",
        eventValue: { filter: Object.keys(patch)[0], value: Object.values(patch)[0] },
      });
    },
    [filters, onChange],
  );

  const reset = useCallback(() => {
    onChange({
      ...filters,
      search: "",
      budgetMin: null,
      budgetMax: null,
      rangeMin: null,
      brand: null,
      bodyType: null,
      seats: null,
      batteryMin: null,
      emiMax: null,
    });
  }, [filters, onChange]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Filter header / toggle (mobile) */}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between px-5 py-4 lg:cursor-default"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6 10a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm2 5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Filters
          {active && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              •
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition lg:hidden ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className={`${open ? "block" : "hidden"} lg:block`}>
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-6">
          {/* Brand */}
          <FilterGroup label="Brand">
            <div className="flex flex-wrap gap-2">
              <Chip
                active={filters.brand === null}
                onClick={() => update({ brand: null })}
              >
                All
              </Chip>
              {brands.map((b) => (
                <Chip key={b} active={filters.brand === b} onClick={() => update({ brand: b })}>
                  {b}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          {/* Body type */}
          {bodyTypes.length > 0 && (
            <FilterGroup label="Body Type">
              <div className="flex flex-wrap gap-2">
                <Chip active={filters.bodyType === null} onClick={() => update({ bodyType: null })}>
                  All
                </Chip>
                {bodyTypes.map((bt) => (
                  <Chip
                    key={bt}
                    active={filters.bodyType === bt}
                    onClick={() => update({ bodyType: bt })}
                  >
                    {bt.charAt(0).toUpperCase() + bt.slice(1)}
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}

          {/* Price */}
          <FilterGroup label="Max Price">
            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  active={filters.budgetMax === p.max}
                  onClick={() => update({ budgetMax: p.max })}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          {/* Range */}
          <FilterGroup label="Min Range">
            <div className="flex flex-wrap gap-2">
              {RANGE_PRESETS.map((r) => (
                <Chip
                  key={r.label}
                  active={filters.rangeMin === r.min}
                  onClick={() => update({ rangeMin: r.min })}
                >
                  {r.label}
                </Chip>
              ))}
              <Chip
                active={filters.rangeMin === null}
                onClick={() => update({ rangeMin: null })}
              >
                Any
              </Chip>
            </div>
          </FilterGroup>

          {/* Seats */}
          <FilterGroup label="Min Seats">
            <div className="flex flex-wrap gap-2">
              <Chip active={filters.seats === null} onClick={() => update({ seats: null })}>
                Any
              </Chip>
              {SEAT_OPTIONS.map((s) => (
                <Chip key={s} active={filters.seats === s} onClick={() => update({ seats: s })}>
                  {s}+
                </Chip>
              ))}
            </div>
          </FilterGroup>

          {/* Reset */}
          {active && (
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-2xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
      }`}
    >
      {children}
    </button>
  );
}
