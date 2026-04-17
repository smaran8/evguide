import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readConsentFromCookieHeader, hasAnalyticsConsent } from "@/lib/privacy/consent";
import { applyRateLimit } from "@/lib/security/rate-limit";
import type { PlatformSessionPayload } from "@/lib/platform/session";

export async function POST(request: Request) {
  try {
    const consent = readConsentFromCookieHeader(request.headers.get("cookie"));
    if (!hasAnalyticsConsent(consent)) {
      return NextResponse.json({ skipped: "no-consent" }, { status: 202 });
    }

    const rateLimit = applyRateLimit(request, "platform-session", 10, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    let body: PlatformSessionPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof body.anonymous_id !== "string" || !body.anonymous_id.trim()) {
      return NextResponse.json({ error: "anonymous_id is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Upsert anonymous_visitors — creates on first visit, updates last_seen_at
    // and refreshes attribution data on returning visits.
    const { data: visitor, error: visitorError } = await admin
      .from("anonymous_visitors")
      .upsert(
        {
          anonymous_id: body.anonymous_id.trim(),
          last_seen_at: new Date().toISOString(),
          source: body.source ?? null,
          medium: body.medium ?? null,
          campaign: body.campaign ?? null,
          referrer: body.referrer ?? null,
          device_type: body.device_type ?? null,
          browser: body.browser ?? null,
          os: body.os ?? null,
        },
        { onConflict: "anonymous_id", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    if (visitorError || !visitor) {
      console.error("[platform/session] visitor upsert failed:", visitorError?.message);
      return NextResponse.json({ error: "Session init failed." }, { status: 500 });
    }

    // Each browser tab session gets its own user_sessions row.
    const { data: session, error: sessionError } = await admin
      .from("user_sessions")
      .insert({
        anonymous_visitor_id: visitor.id,
        session_token: crypto.randomUUID(),
        landing_page: body.landing_page ?? null,
        source: body.source ?? null,
        medium: body.medium ?? null,
        campaign: body.campaign ?? null,
        referrer: body.referrer ?? null,
        device_type: body.device_type ?? null,
        browser: body.browser ?? null,
        os: body.os ?? null,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("[platform/session] session insert failed:", sessionError?.message);
      return NextResponse.json({ error: "Session init failed." }, { status: 500 });
    }

    return NextResponse.json({ session_id: session.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[platform/session] unexpected error:", message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
