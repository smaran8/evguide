"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/tracking/client";
import type { UserEventType } from "@/types";

type Props = {
  eventType: UserEventType;
  carId?: string | null;
  eventValue?: Record<string, unknown> | null;
};

export default function TrackOnMount({ eventType, carId = null, eventValue = null }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    void trackEvent({
      eventType,
      carId,
      eventValue,
      pagePath: pathname || "/",
    });
  }, [eventType, carId, eventValue, pathname]);

  return null;
}
