"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getPageCategory } from "@/components/tracking/helpers";
import { trackEvent } from "@/lib/tracking/client";

export default function TrackPageView() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const nextPath = pathname || "/";
    if (lastTrackedPath.current === nextPath) return;

    lastTrackedPath.current = nextPath;

    void trackEvent({
      eventType: "page_view",
      pagePath: nextPath,
      eventValue: {
        category: getPageCategory(nextPath),
      },
    });
  }, [pathname]);

  return null;
}
