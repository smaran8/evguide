import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/admin";
import { syncKeywordsToPages } from "@/lib/seo-keywords";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let threshold = 70;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.threshold === "number") {
      threshold = Math.min(100, Math.max(0, body.threshold));
    }
  } catch {
    // Use default threshold
  }

  try {
    const result = await syncKeywordsToPages(threshold);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[seo/sync] error:", err);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
