"use client";

import { useState } from "react";

export default function AdminTestDriveForwardButton({
  id,
  vehicleLabel,
  customerName,
  customerEmail,
  location,
  preferredDate,
  preferredTimeSlot,
}: {
  id: string;
  vehicleLabel: string | null;
  customerName: string;
  customerEmail: string;
  location: string;
  preferredDate: string;
  preferredTimeSlot: string;
}) {
  const [emailTo, setEmailTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isMgLead = (vehicleLabel ?? "").toLowerCase().includes("mg");
  if (!isMgLead) return null;

  async function forward() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/test-drives/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          emailTo: emailTo.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "Unable to forward lead.");
        return;
      }

      setMessage(`Lead forwarded to ${payload.forwardedTo ?? emailTo}.`);
    } catch {
      setError("Network error while forwarding lead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] font-medium text-slate-500">Forward MG lead to dealer</p>
      <input
        type="email"
        value={emailTo}
        onChange={(event) => setEmailTo(event.target.value)}
        placeholder="Enter MG dealer email"
        className="w-56 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
      />
      <button
        type="button"
        onClick={forward}
        disabled={loading}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Forwarding..." : "Forward to MG Dealer"}
      </button>
      <p className="text-[11px] text-slate-400">
        {customerName} · {customerEmail} · {vehicleLabel ?? "Unknown vehicle"} · {location} · {preferredDate} {preferredTimeSlot}
      </p>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
