import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readConsentFromCookieHeader, hasAnalyticsConsent } from "@/lib/privacy/consent";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { isPlatformEventName } from "@/lib/platform/event-names";

interface TrackRequestBody {
  session_id?: string | null;
  event_name: string;
  page_path?: string;
  vehicle_id?: string | null;
  metadata?: Record<string, unknown>;
  event_value?: number | null;
}

export async function POST(request: Request) {
  try {
    const consent = readConsentFromCookieHeader(request.headers.get("cookie"));
    if (!hasAnalyticsConsent(consent)) {
      return NextResponse.json({ skipped: "no-consent" }, { status: 202 });
    }

    const rateLimit = applyRateLimit(request, "platform-track", 120, 5 * 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    let body: TrackRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof body.event_name !== "string" || !isPlatformEventName(body.event_name)) {
      return NextResponse.json({ error: "Unknown event name." }, { status: 400 });
    }

    const sessionId =
      typeof body.session_id === "string" && body.session_id.trim().length > 0
        ? body.session_id.trim()
        : null;

    const vehicleId =
      typeof body.vehicle_id === "string" && body.vehicle_id.trim().length > 0
        ? body.vehicle_id.trim()
        : null;

    const metadata =
      body.metadata !== null &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const eventValue =
      typeof body.event_value === "number" && isFinite(body.event_value)
        ? body.event_value
        : null;

    const admin = createAdminClient();

    const { error } = await admin.from("user_events").insert({
      session_id: sessionId,
      event_name: body.event_name,
      page_path: typeof body.page_path === "string" ? body.page_path : "/",
      vehicle_id: vehicleId,
      metadata,
      event_value: eventValue,
    });

    if (error) {
      console.error("[platform/track] insert failed:", error.message);
      return NextResponse.json({ error: "Failed to persist event." }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[platform/track] unexpected error:", message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
