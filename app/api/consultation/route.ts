import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimit = applyRateLimit(request, "consultation-create", 20, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let body: { session_id?: string | null } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — session_id is optional
    }

    const sessionId =
      typeof body.session_id === "string" && body.session_id.trim().length > 0
        ? body.session_id.trim()
        : null;

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("consultations")
      .insert({ session_id: sessionId })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[consultation] create failed:", error?.message);
      return NextResponse.json({ error: "Failed to create consultation." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[consultation] unexpected:", msg);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
