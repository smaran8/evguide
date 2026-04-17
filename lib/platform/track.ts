// Platform event tracking utility.
// Writes to the new user_events table (migration 011 schema).
// Does NOT touch the legacy tracking_events table.

import { hasAnalyticsConsent } from "@/lib/privacy/consent";
import { getPlatformSessionId } from "@/lib/platform/session";
import type { PlatformEventName } from "@/lib/platform/event-names";

export interface TrackPlatformEventOptions {
  vehicleId?: string | null;
  metadata?: Record<string, unknown>;
  eventValue?: number | null;
  pagePath?: string;
}

/**
 * Fires a platform tracking event to /api/platform/track.
 *
 * - Silent on failure — never throws, never blocks the UI.
 * - Skips if analytics consent has not been granted.
 * - session_id is attached automatically from sessionStorage.
 *   Events sent before session init are accepted with null session_id.
 */
export async function trackPlatformEvent(
  eventName: PlatformEventName,
  options: TrackPlatformEventOptions = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  const pagePath =
    options.pagePath ??
    (typeof window !== "undefined" ? window.location.pathname : "/");

  try {
    await fetch("/api/platform/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getPlatformSessionId(),
        event_name: eventName,
        page_path: pagePath,
        vehicle_id: options.vehicleId ?? null,
        metadata: options.metadata ?? {},
        event_value: options.eventValue ?? null,
      }),
      keepalive: true,
    });
  } catch {
    // Silent — tracking must never interrupt user flows.
  }
}
