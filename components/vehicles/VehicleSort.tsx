"use client";

import { useCallback } from "react";
import { trackEvent } from "@/lib/tracking/client";
import { SORT_OPTIONS } from "@/lib/vehicles/sort";
import type { AllVehiclesSortOption } from "@/types";

type Props = {
  value: AllVehiclesSortOption;
  onChange: (v: AllVehiclesSortOption) => void;
  totalCount: number;
  filteredCount: number;
};

export default function VehicleSort({ value, onChange, totalCount, filteredCount }: Props) {
  const handleChange = useCallback(
    (next: AllVehiclesSortOption) => {
      onChange(next);
      void trackEvent({
        eventType: "sort_changed",
        eventValue: { sort: next },
      });
    },
    [onChange],
  );

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-900">{filteredCount}</span>
        {filteredCount !== totalCount && (
          <span className="text-slate-400"> of {totalCount}</span>
        )}{" "}
        vehicles
      </p>

      <div className="flex items-center gap-2">
        <p className="hidden text-xs font-medium text-slate-500 sm:block">Sort by</p>
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value as AllVehiclesSortOption)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
