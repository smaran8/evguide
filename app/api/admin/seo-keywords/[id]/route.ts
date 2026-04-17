import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/admin";
import { deleteKeyword, getKeywordById, upsertKeyword } from "@/lib/seo-keywords";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await getKeywordById(id);
  if (!existing) {
    return NextResponse.json({ error: "Keyword not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const updated = await upsertKeyword({
      id,
      keyword: typeof body.keyword === "string" ? body.keyword.trim() : existing.keyword,
      search_volume:
        typeof body.search_volume === "number" ? body.search_volume : existing.search_volume,
      trend_score:
        typeof body.trend_score === "number" ? body.trend_score : existing.trend_score,
      intent: (["informational", "commercial", "transactional", "navigational"].includes(
        body.intent as string,
      )
        ? body.intent
        : existing.intent) as "informational" | "commercial" | "transactional" | "navigational",
      target_page:
        typeof body.target_page === "string" && (body.target_page as string).startsWith("/")
          ? (body.target_page as string)
          : existing.target_page,
      is_active: typeof body.is_active === "boolean" ? body.is_active : existing.is_active,
      is_overridden: true,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update keyword." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    await deleteKeyword(id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Failed to delete keyword." }, { status: 500 });
  }
}
