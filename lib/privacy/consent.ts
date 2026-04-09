export type ConsentState = "granted" | "denied" | "unset";

export const ANALYTICS_CONSENT_KEY = "evguide_analytics_consent";
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function readConsentCookie() {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${ANALYTICS_CONSENT_KEY}=`));

  if (!cookie) return null;

  const value = decodeURIComponent(cookie.split("=")[1] ?? "");
  return value === "granted" || value === "denied" ? value : null;
}

export function readAnalyticsConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";

  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {
    // Fall through to cookie-based consent storage.
  }

  const cookieValue = readConsentCookie();
  if (cookieValue) return cookieValue;

  return "unset";
}

export function writeAnalyticsConsent(value: Exclude<ConsentState, "unset">) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Ignore storage write failures and rely on cookies instead.
  }

  document.cookie =
    `${ANALYTICS_CONSENT_KEY}=${encodeURIComponent(value)}; ` +
    `Max-Age=${CONSENT_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;

  window.dispatchEvent(new CustomEvent("evguide-consent-changed"));
}

export function hasAnalyticsConsent() {
  return readAnalyticsConsent() === "granted";
}
