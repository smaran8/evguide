"use client";

import { useEffect, useState } from "react";
import type { UserIntentProfileRow } from "@/types";

export type UseIntentProfileResult = {
  profile: UserIntentProfileRow | null;
  /** true only during the initial fetch — callers should show generic content */
  loading: boolean;
};

/**
 * Fetches the current user's intent profile from /api/me/intent once on mount.
 *
 * The profile will be null when:
 *  - The user has no behavioral history yet (new visitor)
 *  - The initial fetch is still in flight (loading === true)
 *  - The network request failed (silent degradation)
 *
 * Components consuming this hook must always render sensible generic content
 * as the default/loading state.
 */
export function useIntentProfile(): UseIntentProfileResult {
  const [profile, setProfile] = useState<UserIntentProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/me/intent", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ profile: UserIntentProfileRow | null }>;
      })
      .then((data) => {
        if (!cancelled) setProfile(data?.profile ?? null);
      })
      .catch(() => {
        // Profile fetch failure is non-fatal — components fall back to generic content.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading };
}
