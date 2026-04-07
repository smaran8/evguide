"use server";

import { redirect } from "next/navigation";
import { createGeoRegion, updateGeoRegion, deleteGeoRegion } from "@/lib/geo";
import { GeoRegionInput } from "@/lib/geo";

function parseForm(formData: FormData): GeoRegionInput {
  const latRaw = formData.get("lat") as string;
  const lngRaw = formData.get("lng") as string;
  return {
    name: (formData.get("name") as string).trim(),
    slug: (formData.get("slug") as string).trim(),
    country: (formData.get("country") as string).trim() || "GB",
    region_type: (formData.get("region_type") as GeoRegionInput["region_type"]) ?? "city",
    description: (formData.get("description") as string) || null,
    lat: latRaw ? parseFloat(latRaw) : null,
    lng: lngRaw ? parseFloat(lngRaw) : null,
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt((formData.get("sort_order") as string) || "0", 10),
  };
}

export async function createGeoRegionAction(formData: FormData) {
  await createGeoRegion(parseForm(formData));
  redirect("/admin/geo");
}

export async function updateGeoRegionAction(id: string, formData: FormData) {
  await updateGeoRegion(id, parseForm(formData));
  redirect("/admin/geo");
}

export async function deleteGeoRegionAction(id: string) {
  await deleteGeoRegion(id);
  redirect("/admin/geo");
}
