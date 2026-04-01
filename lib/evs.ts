import { createClient } from "@/lib/supabase/server";

export async function getTopSellingEVs() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ev_models")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching EVs:", error);
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    brand: item.brand,
    model: item.model,
    heroImage: item.hero_image,
    price: item.price,
    batteryKWh: item.battery_kwh,
    rangeKm: item.range_km,
    description: item.description,
    bestFor: item.best_for,
    lovedReason: item.loved_reason,
  }));
}