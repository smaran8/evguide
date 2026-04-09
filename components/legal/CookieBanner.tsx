"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/privacy/consent";

export default function CookieBanner() {
  const [consent, setConsent] = useState<"granted" | "denied" | "unset">(() => readAnalyticsConsent());

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === ANALYTICS_CONSENT_KEY) {
        setConsent(readAnalyticsConsent());
      }
    }

    function handleConsentChanged() {
      setConsent(readAnalyticsConsent());
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("evguide-consent-changed", handleConsentChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("evguide-consent-changed", handleConsentChanged);
    };
  }, []);

  if (consent !== "unset") {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-[#0E1113]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:inset-x-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Privacy choices</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Help us improve EVGuide</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            We use essential cookies to run the product. With your permission, we also use analytics
            cookies and similar storage to understand usage, improve journeys, and measure conversion.
            Read our{" "}
            <Link href="/cookies" className="text-emerald-300 transition hover:text-emerald-200">
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-emerald-300 transition hover:text-emerald-200">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              writeAnalyticsConsent("denied");
              setConsent("denied");
            }}
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => {
              writeAnalyticsConsent("granted");
              setConsent("granted");
            }}
            className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
