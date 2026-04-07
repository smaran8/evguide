"use client";

import { useEffect } from "react";
import { trackRepeatVisit } from "@/lib/tracking/client";

export default function TrackRepeatVisit() {
  useEffect(() => {
    void trackRepeatVisit();
  }, []);

  return null;
}
