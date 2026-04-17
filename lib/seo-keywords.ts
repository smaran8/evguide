import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeoKeyword = {
  id: string;
  keyword: string;
  search_volume: number;
  trend_score: number;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  target_page: string;
  is_active: boolean;
  is_overridden: boolean;
  created_at: string;
  updated_at: string;
};

export type SeoKeywordInput = Omit<SeoKeyword, "id" | "created_at" | "updated_at">;

// Intent → page slug mapping rules (ordered, first match wins)
const INTENT_PAGE_RULES: Array<{ match: RegExp; page: string }> = [
  { match: /financ|loan|emi|interest rate|leasing|monthly payment/i, page: "/finance" },
  { match: /compar|vs\.?\s|versus/i, page: "/compare" },
  { match: /charg|charger|charge point|charging station/i, page: "/charging" },
  { match: /exchange|part.?ex|trade.?in|sell.*car/i, page: "/exchange" },
  { match: /ai match|recommend|find.*car|suggest/i, page: "/ai-match" },
];

// ─── Trending simulation ──────────────────────────────────────────────────────

/**
 * Returns active keywords from the DB, with a small simulated "live" drift
 * applied to trend_score (±3 pts) so the UI shows movement between syncs.
 * Real implementation: replace the drift with a Google Trends / SerpAPI call.
 */
export async function getTrendingKeywords(): Promise<SeoKeyword[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("seo_keywords")
    .select("*")
    .eq("is_active", true)
    .order("trend_score", { ascending: false });

  if (error) throw new Error(error.message);

  // Simulate live trend drift for non-overridden keywords
  return (data ?? []).map((kw: SeoKeyword) => {
    if (kw.is_overridden) return kw;
    const drift = (Math.random() * 6 - 3); // -3 … +3
    const simulated = Math.min(100, Math.max(0, kw.trend_score + drift));
    return { ...kw, trend_score: Math.round(simulated * 10) / 10 };
  });
}

// ─── Intent mapper ────────────────────────────────────────────────────────────

/**
 * Returns the best-guess target page slug for a raw keyword string.
 * Falls back to /vehicles for anything EV-related.
 */
export function mapKeywordToPage(keyword: string): string {
  for (const rule of INTENT_PAGE_RULES) {
    if (rule.match.test(keyword)) return rule.page;
  }
  return "/vehicles";
}

// ─── FAQ generator ────────────────────────────────────────────────────────────

type FaqItem = { question: string; answer: string };

function keywordToFaq(keyword: string): FaqItem {
  const k = keyword.toLowerCase();

  if (/finance|loan|emi/.test(k)) {
    return {
      question: `How does EV finance work in the UK for "${keyword}"?`,
      answer:
        "UK EV finance typically uses PCP or HP agreements. You pay a deposit, fixed monthly EMIs, and optionally a balloon payment at the end. EV Guide's finance calculator shows exact monthly costs for every bank offer.",
    };
  }
  if (/range|anxiety/.test(k)) {
    return {
      question: `Is range anxiety still a concern for "${keyword}"?`,
      answer:
        "Modern EVs cover 200–400 miles per charge. Combined with the UK's rapid expansion of public charging, most drivers find real-world range meets daily needs. Our range confidence tool shows predicted range per vehicle.",
    };
  }
  if (/charg/.test(k)) {
    return {
      question: `Where can I find EV charging for "${keyword}"?`,
      answer:
        "EV Guide maps thousands of UK charge points in real time. Filter by connector type, speed (rapid / fast / slow), and network. Home charger installation guides are also available.",
    };
  }
  if (/cost|running|cheap|affordable/.test(k)) {
    return {
      question: `What are the running costs for "${keyword}"?`,
      answer:
        "EVs cost roughly 2–4p per mile to charge at home vs 15–18p per mile for petrol. Add zero road tax on zero-emission vehicles and lower servicing costs — total ownership is often cheaper than ICE within 2–3 years.",
    };
  }
  if (/tax|incentive|grant/.test(k)) {
    return {
      question: `What government incentives apply to "${keyword}"?`,
      answer:
        "Zero-emission cars pay £0 road tax. The Plug-in Car Grant has ended for cars but remains for vans. Workplace charging schemes and home charger grants through the OZEV are still available in 2026.",
    };
  }
  if (/compar|vs|versus/.test(k)) {
    return {
      question: `How do I compare EVs for "${keyword}"?`,
      answer:
        "EV Guide's side-by-side comparison covers range, charging speed, boot space, safety rating, total cost of ownership, and real-world efficiency. Add up to three models and export a PDF report.",
    };
  }

  // Generic fallback
  return {
    question: `What should I know about "${keyword}"?`,
    answer:
      "EV Guide covers everything from browsing the UK's latest electric cars, finance calculators, and AI-powered matching to part-exchange valuations and live charging maps — all in one place.",
  };
}

// ─── Auto-sync engine ─────────────────────────────────────────────────────────

export type SyncResult = {
  pagesUpdated: number;
  keywordsApplied: number;
  slugsUpdated: string[];
};

/**
 * Reads trending keywords (trend_score >= threshold), groups them by
 * target_page, then upserts each seo_pages record with:
 *  - merged keyword array
 *  - updated FAQ content blocks
 *  - auto_updated_at timestamp
 */
export async function syncKeywordsToPages(
  trendThreshold = 70,
): Promise<SyncResult> {
  const admin = createAdminClient();

  // Fetch qualifying keywords
  const { data: kwData, error: kwError } = await admin
    .from("seo_keywords")
    .select("*")
    .eq("is_active", true)
    .gte("trend_score", trendThreshold)
    .order("trend_score", { ascending: false });

  if (kwError) throw new Error(kwError.message);
  const keywords: SeoKeyword[] = kwData ?? [];

  // Group by target_page
  const byPage = new Map<string, SeoKeyword[]>();
  for (const kw of keywords) {
    const list = byPage.get(kw.target_page) ?? [];
    list.push(kw);
    byPage.set(kw.target_page, list);
  }

  const slugsUpdated: string[] = [];
  let keywordsApplied = 0;

  for (const [slug, pageKeywords] of byPage.entries()) {
    const topKeywords = pageKeywords.slice(0, 8);
    const keywordStrings = topKeywords.map((k) => k.keyword);

    // Build FAQ content blocks from top 5 keywords
    const faqItems: FaqItem[] = topKeywords.slice(0, 5).map((k) => keywordToFaq(k.keyword));

    const faqBlock = {
      type: "faq",
      heading: "Frequently Asked Questions",
      items: faqItems.map((f) => ({ question: f.question, answer: f.answer })),
    };

    // Fetch existing page record
    const { data: existing } = await admin
      .from("seo_pages")
      .select("id, keywords, content_blocks, is_active")
      .eq("page_slug", slug)
      .single();

    if (existing) {
      // Merge keyword arrays (deduplicated)
      const merged = Array.from(
        new Set([...(existing.keywords ?? []), ...keywordStrings]),
      );

      // Replace or insert FAQ block in content_blocks
      const existingBlocks: Array<{ type: string }> =
        (existing.content_blocks as Array<{ type: string }>) ?? [];
      const withoutFaq = existingBlocks.filter((b) => b.type !== "faq");
      const updatedBlocks = [...withoutFaq, faqBlock];

      await admin
        .from("seo_pages")
        .update({
          keywords: merged,
          content_blocks: updatedBlocks,
          faq_schema: faqItems,
          auto_updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create a new seo_pages record for this slug
      await admin.from("seo_pages").insert({
        page_slug: slug,
        keywords: keywordStrings,
        content_blocks: [faqBlock],
        faq_schema: faqItems,
        is_active: true,
        auto_updated_at: new Date().toISOString(),
      });
    }

    slugsUpdated.push(slug);
    keywordsApplied += topKeywords.length;
  }

  return {
    pagesUpdated: slugsUpdated.length,
    keywordsApplied,
    slugsUpdated,
  };
}

// ─── CRUD (admin) ─────────────────────────────────────────────────────────────

export async function getAllKeywords(): Promise<SeoKeyword[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("seo_keywords")
    .select("*")
    .order("trend_score", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getKeywordById(id: string): Promise<SeoKeyword | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("seo_keywords")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function upsertKeyword(
  input: SeoKeywordInput & { id?: string },
): Promise<SeoKeyword> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("seo_keywords")
    .upsert(input, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteKeyword(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("seo_keywords").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
