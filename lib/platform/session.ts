// Platform session management.
// Manages anonymous_visitors and user_sessions rows (migration 011).
//
// anonymous_id  — reuses the existing evguide_tracking_session_id from
//                 localStorage so both tracking systems share the same
//                 device fingerprint.
// platform_session_id — UUID from user_sessions.id, stored in
//                       sessionStorage (new tab = new session row).

import {
  canUseNonEssentialStorage,
  TRACKING_SESSION_ID_KEY,
} from "@/lib/privacy/consent";

const PLATFORM_SESSION_KEY = "evg_platform_session_id";

// ── Anonymous ID ─────────────────────────────────────────────────────────────

/**
 * Reads the anonymous ID that was created by the legacy tracking system
 * (lib/tracking/identity.ts). Returns null if consent was not granted
 * or localStorage is unavailable.
 */
export function getAnonymousId(): string | null {
  if (typeof window === "undefined") return null;
  if (!canUseNonEssentialStorage()) return null;
  try {
    const value = window.localStorage.getItem(TRACKING_SESSION_ID_KEY);
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

// ── Platform session ID ──────────────────────────────────────────────────────

/** Reads the platform session UUID from sessionStorage. */
export function getPlatformSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(PLATFORM_SESSION_KEY);
  } catch {
    return null;
  }
}

function setPlatformSessionId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PLATFORM_SESSION_KEY, id);
  } catch {
    // Events will still fire without a linked session_id FK.
  }
}

// ── Device / UTM helpers ─────────────────────────────────────────────────────

function getDeviceInfo(): { device_type: string; browser: string; os: string } {
  if (typeof window === "undefined") {
    return { device_type: "unknown", browser: "unknown", os: "unknown" };
  }

  const ua = navigator.userAgent;

  const device_type = /Mobi|Android/i.test(ua)
    ? "mobile"
    : /iPad/i.test(ua)
      ? "tablet"
      : "desktop";

  const browser = ua.includes("Edg")
    ? "Edge"
    : ua.includes("Chrome")
      ? "Chrome"
      : ua.includes("Firefox")
        ? "Firefox"
        : ua.includes("Safari")
          ? "Safari"
          : "Other";

  const os = ua.includes("Windows")
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPad|iPhone/i.test(ua)
        ? "iOS"
        : ua.includes("Mac")
          ? "macOS"
          : ua.includes("Linux")
            ? "Linux"
            : "Other";

  return { device_type, browser, os };
}

function getUTMParams(): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
} {
  if (typeof window === "undefined") {
    return { source: null, medium: null, campaign: null, referrer: null };
  }

  const p = new URLSearchParams(window.location.search);
  return {
    source: p.get("utm_source"),
    medium: p.get("utm_medium"),
    campaign: p.get("utm_campaign"),
    referrer: document.referrer || null,
  };
}

// ── Session init ─────────────────────────────────────────────────────────────

export interface PlatformSessionPayload {
  anonymous_id: string;
  landing_page: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  device_type: string;
  browser: string;
  os: string;
}

/**
 * Initialises the platform session for the current browser session.
 *
 * - Upserts an anonymous_visitors row (first_seen / last_seen).
 * - Creates a new user_sessions row with UTM and device data.
 * - Stores the resulting session UUID in sessionStorage.
 *
 * Safe to call multiple times: no-ops if the session was already
 * initialised this browser tab session.
 *
 * Returns the platform session UUID, or null if skipped.
 */
export async function initPlatformSession(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!canUseNonEssentialStorage()) return null;

  const existing = getPlatformSessionId();
  if (existing) return existing;

  const anonymousId = getAnonymousId();
  if (!anonymousId) return null;

  const payload: PlatformSessionPayload = {
    anonymous_id: anonymousId,
    landing_page: window.location.pathname + window.location.search,
    ...getUTMParams(),
    ...getDeviceInfo(),
  };

  try {
    const res = await fetch("/api/platform/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { session_id?: string };
    if (data.session_id) {
      setPlatformSessionId(data.session_id);
      return data.session_id;
    }
  } catch {
    // Tracking must never disrupt the user experience.
  }

  return null;
}
