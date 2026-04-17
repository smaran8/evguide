"use server";

import { redirect } from "next/navigation";
import {
  deleteKeyword,
  mapKeywordToPage,
  syncKeywordsToPages,
  upsertKeyword,
} from "@/lib/seo-keywords";

export async function createKeywordAction(formData: FormData) {
  const keyword = (formData.get("keyword") as string).trim();

  await upsertKeyword({
    keyword,
    search_volume: Number(formData.get("search_volume") ?? 0),
    trend_score: Number(formData.get("trend_score") ?? 50),
    intent: (formData.get("intent") as "informational" | "commercial" | "transactional" | "navigational") ?? "informational",
    target_page: (formData.get("target_page") as string) || mapKeywordToPage(keyword),
    is_active: formData.get("is_active") === "on",
    is_overridden: true,
  });

  redirect("/admin/seo/keywords");
}

export async function updateKeywordAction(id: string, formData: FormData) {
  const keyword = (formData.get("keyword") as string).trim();

  await upsertKeyword({
    id,
    keyword,
    search_volume: Number(formData.get("search_volume") ?? 0),
    trend_score: Number(formData.get("trend_score") ?? 50),
    intent: (formData.get("intent") as "informational" | "commercial" | "transactional" | "navigational") ?? "informational",
    target_page: (formData.get("target_page") as string) || mapKeywordToPage(keyword),
    is_active: formData.get("is_active") === "on",
    is_overridden: true,
  });

  redirect("/admin/seo/keywords");
}

export async function deleteKeywordAction(id: string) {
  await deleteKeyword(id);
  redirect("/admin/seo/keywords");
}

export async function triggerSyncAction(): Promise<{
  pagesUpdated: number;
  keywordsApplied: number;
  slugsUpdated: string[];
}> {
  return syncKeywordsToPages(70);
}
