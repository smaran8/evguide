/**
 * components/AdminVehicleQueryStatusButton.tsx
 *
 * Client component that lets admin users cycle a vehicle query's
 * status: new → contacted → resolved.
 * Calls the updateVehicleQueryStatus server action and refreshes
 * the page after success.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateVehicleQueryStatus, type QueryStatus } from "@/lib/actions/vehicleQueries";

// Next status in the cycle
const NEXT_STATUS: Record<QueryStatus, QueryStatus> = {
  new:       "contacted",
  contacted: "resolved",
  resolved:  "new",
};

const NEXT_LABEL: Record<QueryStatus, string> = {
  new:       "Mark Contacted",
  contacted: "Mark Resolved",
  resolved:  "Reopen",
};

const NEXT_STYLE: Record<QueryStatus, string> = {
  new:       "border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
  contacted: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
  resolved:  "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
};

interface Props {
  queryId:       string;
  currentStatus: QueryStatus;
}

export default function VehicleQueryStatusButton({ queryId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const next = NEXT_STATUS[currentStatus];
    await updateVehicleQueryStatus(queryId, next);
    setLoading(false);
    router.refresh(); // Re-fetch server component data
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${NEXT_STYLE[currentStatus]}`}
    >
      {loading ? "…" : NEXT_LABEL[currentStatus]}
    </button>
  );
}
