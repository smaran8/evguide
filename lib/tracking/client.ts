"use client";

import type { TrackEventInput } from "@/types";
import { getTrackingIdentity } from "@/lib/tracking/identity";

const FIRST_VISIT_KEY = "evguide_first_visit_at";

function resolvePagePath(path?: string): string {
  if (path && path.trim().length > 0) return path;
  if (typeof window !== "undefined") return window.location.pathname || "/";
  return "/";
}

export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    const identity = getTrackingIdentity();
    if (!identity) return;

    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: input.eventType,
        car_id: input.carId ?? null,
        event_value: input.eventValue ?? null,
        session_id: identity.sessionId,
        page_path: resolvePagePath(input.pagePath),
      }),
      keepalive: true,
    });
  } catch {
    // Tracking should never interrupt user flows.
  }
}

/**
 * Emits `repeat_visit` once per browser after first visit marker exists.
 */
export async function trackRepeatVisit(): Promise<void> {
  try {
    if (typeof window === "undefined") return;

    const seen = window.localStorage.getItem(FIRST_VISIT_KEY);
    if (!seen) {
      window.localStorage.setItem(FIRST_VISIT_KEY, new Date().toISOString());
      return;
    }

    await trackEvent({
      eventType: "repeat_visit",
      eventValue: { first_visit_at: seen },
    });
  } catch {
    // Silent by design.
  }
}
