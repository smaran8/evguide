"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { usePlatformTrack } from "@/hooks/usePlatformTrack";
import type { PlatformEventName } from "@/lib/platform/event-names";
import type { TrackPlatformEventOptions } from "@/lib/platform/track";

interface TrackedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The platform event name to fire on click. */
  eventName: PlatformEventName;
  /** Optional vehicle id, metadata, and event value to attach. */
  trackingOptions?: Omit<TrackPlatformEventOptions, "pagePath">;
  children: ReactNode;
}

/**
 * A drop-in <button> replacement that fires a platform tracking event
 * on click. All standard button props are forwarded.
 *
 * Usage:
 *   <TrackedButton
 *     eventName="clicked_primary_cta"
 *     trackingOptions={{ metadata: { label: "Get Finance Quote" } }}
 *     className="btn-primary"
 *     onClick={handleSubmit}
 *   >
 *     Get Finance Quote
 *   </TrackedButton>
 *
 *   <TrackedButton
 *     eventName="booked_test_drive"
 *     trackingOptions={{ vehicleId: vehicle.id }}
 *     className="btn-secondary"
 *   >
 *     Book Test Drive
 *   </TrackedButton>
 */
export default function TrackedButton({
  eventName,
  trackingOptions = {},
  onClick,
  children,
  ...props
}: TrackedButtonProps) {
  const track = usePlatformTrack();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    track(eventName, trackingOptions);
    onClick?.(e);
  }

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
