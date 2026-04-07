"use client";

import VehicleCard from "@/components/vehicles/VehicleCard";
import type { PersonalizedVehicleCard, VehicleListingSegment } from "@/types";
import { buildRecommendedStrip } from "@/lib/vehicles/recommend";

type Props = {
  vehicles: PersonalizedVehicleCard[];
  segment: VehicleListingSegment;
};

export default function RecommendedVehicles({ vehicles, segment }: Props) {
  const strip = buildRecommendedStrip(vehicles, segment);

  if (strip.vehicles.length === 0) return null;

  return (
    <section className="scroll-mt-24">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Recommended
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{strip.label}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{strip.description}</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {strip.vehicles.map((vehicle, index) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} priority={index < 2} />
        ))}
      </div>
    </section>
  );
}
