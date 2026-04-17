import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/admin";
import { getAllKeywords, mapKeywordToPage, upsertKeyword } from "@/lib/seo-keywords";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const keywords = await getAllKeywords();
    return NextResponse.json(keywords);
  } catch {
    return NextResponse.json({ error: "Failed to fetch keywords." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const keyword = typeof body.keyword === "string" ? body.keyword.trim() : null;
  if (!keyword) {
    return NextResponse.json({ error: "keyword is required." }, { status: 400 });
  }

  try {
    const record = await upsertKeyword({
      keyword,
      search_volume: typeof body.search_volume === "number" ? body.search_volume : 0,
      trend_score: typeof body.trend_score === "number" ? body.trend_score : 50,
      intent: (["informational", "commercial", "transactional", "navigational"].includes(
        body.intent as string,
      )
        ? body.intent
        : "informational") as "informational" | "commercial" | "transactional" | "navigational",
      target_page:
        typeof body.target_page === "string" && body.target_page.startsWith("/")
          ? body.target_page
          : mapKeywordToPage(keyword),
      is_active: body.is_active !== false,
      is_overridden: body.is_overridden === true,
    });

    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create keyword." }, { status: 500 });
  }
}
