"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { trackPlatformEvent } from "@/lib/platform/track";
import type { PlatformEventName } from "@/lib/platform/event-names";
import type { TrackPlatformEventOptions } from "@/lib/platform/track";

/**
 * Returns a stable `track` callback that automatically injects the
 * current page pathname as page_path.
 *
 * Usage in any client component:
 *   const track = usePlatformTrack();
 *   track("clicked_vehicle_card", { vehicleId: car.id });
 *   track("filtered_vehicle_list", { metadata: { brand: "Tesla" } });
 *   track("calculated_emi", { eventValue: 450, metadata: { term: 48 } });
 */
export function usePlatformTrack() {
  const pathname = usePathname();

  return useCallback(
    (
      eventName: PlatformEventName,
      options: Omit<TrackPlatformEventOptions, "pagePath"> = {},
    ) => {
      void trackPlatformEvent(eventName, {
        ...options,
        pagePath: pathname ?? "/",
      });
    },
    [pathname],
  );
}
