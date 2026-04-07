"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { usePathname } from "next/navigation";
import { getPageCategory } from "@/components/tracking/helpers";
import { trackEvent } from "@/lib/tracking/client";

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;
const DWELL_MILESTONES_MS = [15000, 45000] as const;

function getScrollPercent(): number {
  if (typeof window === "undefined") return 0;

  const doc = document.documentElement;
  const maxScrollable = doc.scrollHeight - window.innerHeight;
  if (maxScrollable <= 0) return 100;

  return Math.min(100, Math.max(0, Math.round((window.scrollY / maxScrollable) * 100)));
}

export default function TrackEngagement() {
  const pathname = usePathname() || "/";
  const firedKeysRef = useRef<Set<string>>(new Set());

  const emitMilestone = useEffectEvent((kind: "scroll_depth" | "dwell_time", value: number) => {
    const key = `${kind}:${value}`;
    if (firedKeysRef.current.has(key)) return;

    firedKeysRef.current.add(key);

    void trackEvent({
      eventType: "engagement_milestone",
      pagePath: pathname,
      eventValue: {
        category: getPageCategory(pathname),
        milestone_kind: kind,
        milestone_value: value,
      },
    });
  });

  useEffect(() => {
    firedKeysRef.current = new Set();

    function handleScroll() {
      const percent = getScrollPercent();
      for (const milestone of SCROLL_MILESTONES) {
        if (percent >= milestone) {
          emitMilestone("scroll_depth", milestone);
        }
      }
    }

    const timers = DWELL_MILESTONES_MS.map((duration) =>
      window.setTimeout(() => {
        emitMilestone("dwell_time", duration);
      }, duration),
    );

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [pathname]);

  return null;
}
