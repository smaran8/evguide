import { evModels } from "@/data/evModels";
import type { EVModel } from "@/types";

export type DbEV = {
  id: string;
  brand: string;
  model: string;
  hero_image: string;
  price: number;
  motor_capacity_kw: number;
  torque_nm: number;
  ground_clearance_mm: number;
  tyre_size: string;
  battery_kwh: number;
  range_km: number;
  drive: string;
  charging_standard: string;
  fast_charge_time: string;
  adas: string;
  warranty: string;
  seats: number;
  boot_litres: number;
  top_speed_kph: number;
  acceleration: string;
  description: string;
  best_for: string;
  loved_reason: string;
};

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function getFallbackHeroImage(item: Pick<DbEV, "id" | "brand" | "model">) {
  const exactMatch = evModels.find((model) => model.id === item.id);
  if (exactMatch) {
    return exactMatch.heroImage;
  }

  const brand = normalizeValue(item.brand);
  const model = normalizeValue(item.model);

  return evModels.find(
    (entry) => normalizeValue(entry.brand) === brand && normalizeValue(entry.model) === model,
  )?.heroImage;
}

export function resolveEvHeroImage(item: Pick<DbEV, "id" | "brand" | "model" | "hero_image">) {
  const heroImage = item.hero_image?.trim() ?? "";

  if (heroImage && !heroImage.startsWith("/uploads/")) {
    return heroImage;
  }

  return (
    (getFallbackHeroImage(item) ?? heroImage) ||
    "https://images.unsplash.com/photo-1553440569-bcc63803a83d?q=80&w=1200&auto=format&fit=crop"
  );
}

export function mapDbEV(item: DbEV): EVModel {
  return {
    id: item.id,
    brand: item.brand,
    model: item.model,
    heroImage: resolveEvHeroImage(item),
    price: item.price,
    motorCapacityKw: item.motor_capacity_kw,
    torqueNm: item.torque_nm,
    groundClearanceMm: item.ground_clearance_mm,
    tyreSize: item.tyre_size,
    batteryKWh: item.battery_kwh,
    rangeKm: item.range_km,
    drive: item.drive,
    chargingStandard: item.charging_standard,
    fastChargeTime: item.fast_charge_time,
    adas: item.adas,
    warranty: item.warranty,
    seats: item.seats,
    bootLitres: item.boot_litres,
    topSpeedKph: item.top_speed_kph,
    acceleration: item.acceleration,
    description: item.description,
    bestFor: item.best_for,
    lovedReason: item.loved_reason,
  };
}