import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SeoPage = {
  id: string;
  page_slug: string;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  keywords: string[] | null;
  canonical_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SeoPageInput = Omit<SeoPage, "id" | "created_at" | "updated_at">;

// ─── Public helpers ─────────────────────────────────────────────────────────

export async function getSeoForSlug(slug: string): Promise<SeoPage | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("page_slug", slug)
    .eq("is_active", true)
    .single();
  return data ?? null;
}

// ─── Admin helpers ───────────────────────────────────────────────────────────

export async function getAllSeoPages(): Promise<SeoPage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("seo_pages")
    .select("*")
    .order("page_slug", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSeoPageById(id: string): Promise<SeoPage | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function upsertSeoPage(
  input: SeoPageInput & { id?: string },
): Promise<SeoPage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("seo_pages")
    .upsert({ ...input }, { onConflict: "page_slug" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSeoPage(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("seo_pages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
