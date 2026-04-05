import { createClient } from "@/lib/supabase/server";
import { mapDbEV, type DbEV } from "@/lib/ev-models";

export async function getAllEVs() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ev_models")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all EVs:", error);
    return [];
  }

  return (data ?? []).map((item) => mapDbEV(item as DbEV));
}

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

  return data.map((item) => mapDbEV(item as DbEV));
}