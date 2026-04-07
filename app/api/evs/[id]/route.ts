import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("ev_models")
      .update({
        brand: body.brand,
        model: body.model,
        hero_image: body.hero_image,
        price: body.price,
        motor_capacity_kw: body.motor_capacity_kw,
        torque_nm: body.torque_nm,
        ground_clearance_mm: body.ground_clearance_mm,
        tyre_size: body.tyre_size,
        battery_kwh: body.battery_kwh,
        range_km: body.range_km,
        drive: body.drive,
        charging_standard: body.charging_standard,
        fast_charge_time: body.fast_charge_time,
        adas: body.adas,
        warranty: body.warranty,
        seats: body.seats,
        boot_litres: body.boot_litres,
        top_speed_kph: body.top_speed_kph,
        acceleration: body.acceleration,
        description: body.description,
        best_for: body.best_for,
        loved_reason: body.loved_reason,
        tier: body.tier ?? null,
        body_type: body.body_type ?? null,
        badge: body.badge ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("ev_models")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
