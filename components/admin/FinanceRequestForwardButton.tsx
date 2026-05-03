"use client";

import { useMemo, useState } from "react";

interface FinanceRequestForwardButtonProps {
  consultationId: string | null;
  lenderName: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  applicantPhone: string | null;
  vehicleLabel: string | null;
  depositGbp: number | null;
  termMonths: number | null;
  monthlyPaymentGbp: number | null;
  notes: string | null;
}

function money(value: number | null) {
  return typeof value === "number" ? `GBP ${Math.round(value).toLocaleString("en-GB")}` : "Not provided";
}

export default function FinanceRequestForwardButton({
  consultationId,
  lenderName,
  applicantName,
  applicantEmail,
  applicantPhone,
  vehicleLabel,
  depositGbp,
  termMonths,
  monthlyPaymentGbp,
  notes,
}: FinanceRequestForwardButtonProps) {
  const [emailTo, setEmailTo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const lender = lenderName?.trim() || "Selected lender";
  const applicant = applicantName?.trim() || "EV Guide applicant";

  const mailtoHref = useMemo(() => {
    const body = [
      `EV Guide is forwarding a finance request for ${lender}.`,
      "",
      "Applicant",
      `Name: ${applicant}`,
      `Email: ${applicantEmail ?? "Not provided"}`,
      `Phone: ${applicantPhone ?? "Not provided"}`,
      "",
      "Finance request",
      `Vehicle: ${vehicleLabel ?? "Not provided"}`,
      `Deposit: ${money(depositGbp)}`,
      `Term: ${termMonths ? `${termMonths} months` : "Not provided"}`,
      `Estimated monthly payment: ${money(monthlyPaymentGbp)}`,
      "",
      "Captured details",
      notes ?? "No additional notes",
      "",
      `EV Guide reference: ${consultationId ?? "Not available"}`,
    ].join("\n");

    return `mailto:${encodeURIComponent(emailTo.trim())}?subject=${encodeURIComponent(
      `EV Guide Finance Request - ${lender} - ${applicant}`,
    )}&body=${encodeURIComponent(body)}`;
  }, [
    applicant,
    applicantEmail,
    applicantPhone,
    consultationId,
    depositGbp,
    emailTo,
    lender,
    monthlyPaymentGbp,
    notes,
    termMonths,
    vehicleLabel,
  ]);

  async function markContacted() {
    setError("");
    setMessage("");

    if (!emailTo.trim()) {
      setError("Enter the lender email first.");
      return;
    }

    if (!consultationId) {
      setMessage("Email draft opened. This row has no consultation status to update.");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: consultationId, status: "contacted" }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Email draft opened, but status update failed.");
        return;
      }

      setMessage("Email draft opened. Request marked as contacted.");
    } catch {
      setError("Email draft opened, but status update failed.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="email"
        value={emailTo}
        onChange={(event) => setEmailTo(event.target.value)}
        placeholder="lender@example.com"
        className="w-52 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
      />
      <a
        href={emailTo.trim() ? mailtoHref : undefined}
        onClick={(event) => {
          if (!emailTo.trim()) {
            event.preventDefault();
            setError("Enter the lender email first.");
            return;
          }
          void markContacted();
        }}
        className="inline-flex rounded-lg border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 aria-disabled:pointer-events-none aria-disabled:opacity-60"
        aria-disabled={updating || !emailTo.trim()}
      >
        {updating ? "Marking..." : "Email lender"}
      </a>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
