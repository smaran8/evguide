"use client";

import Image from "next/image";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking/client";
import type { PersonalizedVehicleCard } from "@/types";

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  affordable: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  mid: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  premium: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
};

const BADGE_STYLES: Record<string, string> = {
  "Best Value": "bg-amber-100 text-amber-800",
  "Long Range": "bg-sky-100 text-sky-800",
  "Family Pick": "bg-rose-100 text-rose-800",
  "City Friendly": "bg-teal-100 text-teal-800",
  "Premium Choice": "bg-purple-100 text-purple-800",
};

type Props = {
  vehicle: PersonalizedVehicleCard;
  priority?: boolean;
};

export default function VehicleCard({ vehicle, priority = false }: Props) {
  const tierStyle = TIER_STYLES[vehicle.tier] ?? TIER_STYLES.mid;
  const badge = vehicle.displayBadge ?? vehicle.badge;
  const badgeStyle = badge ? (BADGE_STYLES[badge] ?? "bg-slate-100 text-slate-700") : null;
  const emi = vehicle.estimatedEmi;

  function onView() {
    void trackEvent({
      eventType: "vehicle_view",
      carId: vehicle.id,
      eventValue: { brand: vehicle.brand, model: vehicle.model, vehicle_tier: vehicle.tier },
    });
  }

  function onCompare() {
    void trackEvent({
      eventType: "compare_clicked",
      carId: vehicle.id,
      eventValue: { source: "all_vehicles_card", vehicle_tier: vehicle.tier },
    });
  }

  function onFinance() {
    void trackEvent({
      eventType: "emi_used",
      carId: vehicle.id,
      eventValue: { source: "all_vehicles_card", estimated_monthly_emi: emi, vehicle_tier: vehicle.tier },
    });
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200/60">
      {/* Image */}
      <Link href={`/cars/${vehicle.id}`} onClick={onView} className="block shrink-0">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
          <Image
            src={vehicle.heroImage}
            alt={`${vehicle.brand} ${vehicle.model}`}
            fill
            unoptimized
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay badges */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
            >
              {vehicle.tier}
            </span>
            {badge && badgeStyle && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeStyle}`}>
                {badge}
              </span>
            )}
          </div>
          <div className="absolute bottom-3 right-3">
            <span className="rounded-full bg-slate-900/75 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {vehicle.rangeKm} km range
            </span>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Header */}
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
            {vehicle.brand}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{vehicle.model}</h3>
            <p className="shrink-0 text-base font-extrabold text-slate-900">
              £{vehicle.price.toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-slate-500">{vehicle.whyRecommended}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Battery" value={`${vehicle.batteryKWh} kWh`} />
          <Stat label="EMI est." value={`£${emi}/mo`} />
          <Stat label="Seats" value={String(vehicle.seats)} />
        </div>

        {/* CTA row */}
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex gap-2">
            <Link
              href={`/cars/${vehicle.id}`}
              onClick={onView}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              View Details
            </Link>
            <Link
              href={`/compare?carA=${vehicle.id}`}
              onClick={onCompare}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Compare
            </Link>
          </div>
          <Link
            href={`/finance?car=${vehicle.id}`}
            onClick={onFinance}
            className="block rounded-2xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Explore Finance — £{emi}/mo
          </Link>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-900">{value}</p>
    </div>
  );
}
