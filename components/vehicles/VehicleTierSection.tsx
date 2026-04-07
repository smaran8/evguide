"use client";

import { useEffect, useRef } from "react";
import VehicleCard from "@/components/vehicles/VehicleCard";
import { trackEvent } from "@/lib/tracking/client";
import type { PersonalizedVehicleCard, VehicleTier } from "@/types";

const TIER_META: Record<
  VehicleTier,
  { heading: string; description: string; accentClass: string }
> = {
  affordable: {
    heading: "Affordable Picks",
    description: "Smart EVs that deliver real value without stretching your budget.",
    accentClass: "bg-emerald-500",
  },
  mid: {
    heading: "Mid-Range Best Value",
    description: "The sweet spot — strong range, great tech, balanced price.",
    accentClass: "bg-blue-500",
  },
  premium: {
    heading: "Premium Picks",
    description: "Top-of-range EVs with exceptional performance and luxury.",
    accentClass: "bg-violet-500",
  },
};

type Props = {
  tier: VehicleTier;
  vehicles: PersonalizedVehicleCard[];
};

export default function VehicleTierSection({ tier, vehicles }: Props) {
  const meta = TIER_META[tier];
  const sectionRef = useRef<HTMLElement>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !trackedRef.current) {
          trackedRef.current = true;
          void trackEvent({
            eventType: "tier_section_viewed",
            eventValue: { tier, vehicle_count: vehicles.length },
          });
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [tier, vehicles.length]);

  if (vehicles.length === 0) return null;

  return (
    <section ref={sectionRef} id={`tier-${tier}`} className="scroll-mt-24">
      <div className="mb-6 flex items-end justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-1.5 h-8 w-1 shrink-0 rounded-full ${meta.accentClass}`} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{meta.heading}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{meta.description}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {vehicles.map((vehicle, index) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} priority={index < 2} />
        ))}
      </div>
    </section>
  );
}
