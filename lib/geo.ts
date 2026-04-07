import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type GeoRegion = {
  id: string;
  name: string;
  slug: string;
  country: string;
  region_type: "city" | "county" | "region" | "country";
  description: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GeoRegionInput = Omit<GeoRegion, "id" | "created_at" | "updated_at">;

export const REGION_TYPES = ["city", "county", "region", "country"] as const;

// ─── Public helpers ──────────────────────────────────────────────────────────

export async function getActiveGeoRegions(): Promise<GeoRegion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("geo_regions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getGeoRegionBySlug(slug: string): Promise<GeoRegion | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("geo_regions")
    .select("*")
    .eq("slug", slug)
    .single();
  return data ?? null;
}

// ─── Admin helpers ───────────────────────────────────────────────────────────

export async function getAllGeoRegions(): Promise<GeoRegion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("geo_regions")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getGeoRegionById(id: string): Promise<GeoRegion | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("geo_regions")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function createGeoRegion(input: GeoRegionInput): Promise<GeoRegion> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("geo_regions")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateGeoRegion(
  id: string,
  input: Partial<GeoRegionInput>,
): Promise<GeoRegion> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("geo_regions")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteGeoRegion(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("geo_regions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
