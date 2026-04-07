import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evModels } from "@/data/evModels";

export async function POST() {
  try {
    const supabase = createAdminClient();

    const rows = evModels.map((v) => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      hero_image: v.heroImage,
      tier: v.tier ?? null,
      body_type: v.bodyType ?? null,
      badge: v.badge ?? null,
      price: v.price,
      motor_capacity_kw: v.motorCapacityKw,
      torque_nm: v.torqueNm,
      ground_clearance_mm: v.groundClearanceMm,
      tyre_size: v.tyreSize,
      battery_kwh: v.batteryKWh,
      range_km: v.rangeKm,
      drive: v.drive,
      charging_standard: v.chargingStandard,
      fast_charge_time: v.fastChargeTime,
      adas: v.adas,
      warranty: v.warranty,
      seats: v.seats,
      boot_litres: v.bootLitres,
      top_speed_kph: v.topSpeedKph,
      acceleration: v.acceleration,
      description: v.description,
      best_for: v.bestFor,
      loved_reason: v.lovedReason,
      popularity_score: 0,
    }));

    const { data, error } = await supabase
      .from("ev_models")
      .upsert(rows, { onConflict: "id" })
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      upserted: data?.length ?? 0,
      total: rows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
