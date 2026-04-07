"use server";

import { redirect } from "next/navigation";
import { upsertSeoPage } from "@/lib/seo";

export async function createSeoPage(formData: FormData) {
  const keywordsRaw = (formData.get("keywords") as string) ?? "";
  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  await upsertSeoPage({
    page_slug: (formData.get("page_slug") as string).trim(),
    meta_title: (formData.get("meta_title") as string) || null,
    meta_description: (formData.get("meta_description") as string) || null,
    og_title: (formData.get("og_title") as string) || null,
    og_description: (formData.get("og_description") as string) || null,
    og_image: (formData.get("og_image") as string) || null,
    canonical_url: (formData.get("canonical_url") as string) || null,
    keywords: keywords.length > 0 ? keywords : null,
    is_active: formData.get("is_active") === "on",
  });

  redirect("/admin/seo");
}

export async function updateSeoPage(id: string, formData: FormData) {
  const keywordsRaw = (formData.get("keywords") as string) ?? "";
  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const supabaseAdmin = (await import("@/lib/supabase/admin")).createAdminClient();
  const { error } = await supabaseAdmin
    .from("seo_pages")
    .update({
      page_slug: (formData.get("page_slug") as string).trim(),
      meta_title: (formData.get("meta_title") as string) || null,
      meta_description: (formData.get("meta_description") as string) || null,
      og_title: (formData.get("og_title") as string) || null,
      og_description: (formData.get("og_description") as string) || null,
      og_image: (formData.get("og_image") as string) || null,
      canonical_url: (formData.get("canonical_url") as string) || null,
      keywords: keywords.length > 0 ? keywords : null,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  redirect("/admin/seo");
}

export async function deleteSeoPageAction(id: string) {
  const { deleteSeoPage } = await import("@/lib/seo");
  await deleteSeoPage(id);
  redirect("/admin/seo");
}
