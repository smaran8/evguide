"use client";

import { useEffect } from "react";
import { initPlatformSession } from "@/lib/platform/session";
import { trackPlatformEvent } from "@/lib/platform/track";
import { hasAnalyticsConsent, COOKIE_CONSENT_EVENT } from "@/lib/privacy/consent";

/**
 * Initialises the platform session once per browser tab session.
 *
 * On mount:
 *  1. Checks analytics consent.
 *  2. Calls initPlatformSession() → upserts anonymous_visitors,
 *     creates user_sessions row, stores UUID in sessionStorage.
 *  3. Fires session_started event.
 *
 * Also re-runs when the user grants consent mid-session (listens for
 * the COOKIE_CONSENT_EVENT custom event dispatched by writeClientConsent).
 *
 * Place inside <CookieConsentProvider> in app/layout.tsx.
 * Renders nothing.
 */
export default function PlatformSessionInit() {
  useEffect(() => {
    async function init() {
      if (!hasAnalyticsConsent()) return;

      const sessionId = await initPlatformSession();
      if (!sessionId) return;

      await trackPlatformEvent("session_started", {
        pagePath: window.location.pathname,
        metadata: {
          landing_page: window.location.pathname + window.location.search,
        },
      });
    }

    void init();

    function onConsentChange() {
      void init();
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
  }, []);

  return null;
}
