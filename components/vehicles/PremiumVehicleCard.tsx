"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Battery, Gauge, Zap, TrendingUp, Info } from "lucide-react";
import QuoteModal from "@/components/vehicles/QuoteModal";
import { trackEvent } from "@/lib/tracking/client";
import type { PersonalizedVehicleCard } from "@/types";

interface PremiumVehicleCardProps {
  vehicle: PersonalizedVehicleCard;
}

export default function PremiumVehicleCard({ vehicle }: PremiumVehicleCardProps) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const isHighMatch = vehicle.recommendationScore >= 80;
  const isGreatMatch = vehicle.recommendationScore >= 60 && vehicle.recommendationScore < 80;

  const scoreBadge = isHighMatch
    ? { text: "Great", color: "bg-[#E8F8F5] text-[#1FBF9F] border-[#D1F2EB]" }
    : isGreatMatch
    ? { text: "Fair", color: "bg-blue-50 text-blue-600 border-blue-200" }
    : { text: "Premium", color: "bg-[#F8FAF9] text-[#6B7280] border-[#E5E7EB]" };

  function onView() {
    void trackEvent({
      eventType: "vehicle_view",
      carId: vehicle.id,
      eventValue: { brand: vehicle.brand, model: vehicle.model, vehicle_tier: vehicle.tier },
    });
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#1FBF9F]/40 hover:shadow-lg">
      <Link href={`/cars/${vehicle.id}`} onClick={onView} className="block">
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-[#F8FAF9]">
          <Image
            src={vehicle.heroImage || "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=1200&auto=format&fit=crop"}
            alt={`${vehicle.brand} ${vehicle.model}`}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          <div className="absolute top-3 left-3 z-10">
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${scoreBadge.color}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              {scoreBadge.text} deal score
            </div>
          </div>

          {vehicle.bestFor ? (
            <div className="absolute right-3 bottom-3 z-10 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              Best for {vehicle.bestFor.toLowerCase()}
            </div>
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60" />
        </div>
      </Link>

      <div className="flex flex-grow flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#374151]">{vehicle.brand}</div>
            <h3 className="line-clamp-1 text-xl font-bold text-[#1A1A1A]">{vehicle.model}</h3>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#1FBF9F]">GBP{vehicle.price.toLocaleString()}</div>
            <div className="text-xs text-[#374151]">Est. GBP{vehicle.estimatedEmi}/mo</div>
          </div>
        </div>

        {vehicle.whyRecommended ? (
          <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#D1F2EB] bg-[#E8F8F5] px-2.5 py-1.5 text-xs font-medium text-[#1FBF9F]">
            <Info className="h-3.5 w-3.5" />
            {vehicle.whyRecommended}
          </div>
        ) : null}

        <div className="rounded-[1.25rem] border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3 text-sm leading-6 text-[#4B5563]">
          This EV is a great fit if you want clearer monthly cost confidence with less compromise day to day.
        </div>

        <div className="mt-auto mb-6 grid grid-cols-3 gap-2 border-y border-[#E5E7EB] py-4">
          <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8FAF9] p-2">
            <Battery className="mb-1 h-4 w-4 text-[#6B7280]" />
            <div className="text-sm font-semibold text-[#1A1A1A]">
              ~{vehicle.realWorldRangeMiles ?? Math.round(vehicle.rangeKm * 0.621371)} mi
            </div>
            <div className="text-[10px] uppercase text-[#374151]">Real-world range</div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8FAF9] p-2">
            <Zap className="mb-1 h-4 w-4 text-[#6B7280]" />
            <div className="text-sm font-semibold text-[#1A1A1A]">{vehicle.batteryKWh}kWh</div>
            <div className="text-[10px] uppercase text-[#374151]">Battery</div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8FAF9] p-2">
            <Gauge className="mb-1 h-4 w-4 text-[#6B7280]" />
            <div className="text-sm font-semibold text-[#1A1A1A]">{vehicle.topSpeedKph}km/h</div>
            <div className="text-[10px] uppercase text-[#374151]">Top Speed</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/cars/${vehicle.id}`}
              onClick={onView}
              className="flex flex-1 items-center justify-center rounded-xl bg-[#1FBF9F] py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#17A589]"
            >
              View Details
            </Link>
            <Link href={`/compare?carA=${vehicle.id}`} className="flex h-[42px] items-center justify-center rounded-xl border border-[#1FBF9F] bg-white px-4 text-sm font-medium text-[#1FBF9F] transition-colors hover:bg-[#E8F8F5]">
              Compare
            </Link>
          </div>
          <button
            onClick={() => setQuoteOpen(true)}
            className="flex w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F8FAF9] py-2.5 text-sm font-medium text-[#374151] transition-colors hover:bg-[#E8F8F5]"
          >
            Get a Quote
          </button>
        </div>
      </div>

      {quoteOpen && (
        <QuoteModal
          vehicle={{ id: vehicle.id, brand: vehicle.brand, model: vehicle.model, price: vehicle.price }}
          onClose={() => setQuoteOpen(false)}
        />
      )}
    </div>
  );
}
