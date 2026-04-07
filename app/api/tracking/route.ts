import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrackingIdentity } from "@/lib/tracking/identity";
import { upsertUserCarInterestOnCarView } from "@/lib/tracking/car-interest";
import { refreshFinancialProfileForIdentity } from "@/lib/profiling/financial-profile";
import { refreshIntentProfileForIdentity } from "@/lib/profiling/intent-profile";
import { refreshLeadScoreForIdentity } from "@/lib/scoring/lead-intent";
import { ALLOWED_TRACKED_EVENTS, FINANCIAL_PROFILE_SIGNAL_EVENTS } from "@/lib/tracking/event-catalog";
import type { UserEventType } from "@/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const eventType = body.event_type;
    const carId = typeof body.car_id === "string" && body.car_id.trim() ? body.car_id.trim() : null;
    const pagePath = typeof body.page_path === "string" && body.page_path.trim() ? body.page_path.trim() : "/";
    const eventValue = isObject(body.event_value) ? body.event_value : null;
    const incomingSessionId =
      typeof body.session_id === "string" && body.session_id.trim().length > 0
        ? body.session_id.trim()
        : null;

    if (typeof eventType !== "string" || !ALLOWED_TRACKED_EVENTS.includes(eventType as UserEventType)) {
      return NextResponse.json({ error: "Invalid event type." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const identity = getTrackingIdentity({
      authenticatedUserId: user?.id ?? null,
      incomingSessionId,
    });

    if (!identity) {
      return NextResponse.json({ error: "session_id is required for anonymous tracking." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("user_events").insert({
      user_id: identity.userId,
      session_id: identity.sessionId,
      car_id: carId,
      event_type: eventType,
      event_value: eventValue,
      page_path: pagePath,
    });

    if (error) {
      console.error("[tracking] insert error:", error.message);
      return NextResponse.json({ error: "Failed to persist event." }, { status: 500 });
    }

    // Keep per-car interest summary and auto-emit repeat_visit on repeated car views.
    if (eventType === "car_view" && carId) {
      const interest = await upsertUserCarInterestOnCarView({
        identity: {
          userId: identity.userId,
          sessionId: identity.sessionId,
        },
        carId,
      });

      if (interest?.isRepeatVisit) {
        const { error: repeatInsertError } = await admin.from("user_events").insert({
          user_id: identity.userId,
          session_id: identity.sessionId,
          car_id: carId,
          event_type: "repeat_visit",
          event_value: {
            source: "car_repeat_detection",
            total_views_per_car: interest.totalViewsPerCar,
            high_interest: interest.isHighInterest,
          },
          page_path: pagePath,
        });

        if (repeatInsertError) {
          console.error("[tracking] failed to auto-insert repeat_visit:", repeatInsertError.message);
        }
      }
    }

    if (FINANCIAL_PROFILE_SIGNAL_EVENTS.includes(eventType as UserEventType)) {
      await refreshFinancialProfileForIdentity({
        userId: identity.userId,
        sessionId: identity.sessionId,
      });
    }

    // Recompute lead score after each event to keep lead_scores current.
    await refreshLeadScoreForIdentity({
      userId: identity.userId,
      sessionId: identity.sessionId,
    });

    // Rebuild the unified intent profile from all now-current upstream tables.
    await refreshIntentProfileForIdentity({
      userId: identity.userId,
      sessionId: identity.sessionId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected tracking error";
    console.error("[tracking] unexpected error:", message);
    return NextResponse.json({ error: "Unexpected tracking error." }, { status: 500 });
  }
}
