"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { runFinanceEngine } from "@/lib/finance-engine";
import type { EVModel } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: EVModel;
  modelA: EVModel;
  modelB: EVModel;
}

interface BankOffer {
  id: string;
  bank: string;
  interestRate: number;
  processingFee: string;
  tag: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
}
function fmtDec(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CompareQuotationModal({ open, onClose, vehicle, modelA, modelB }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const [bestRate, setBestRate] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "email" | "phone", string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Auth prefill ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let active = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return;
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) || "";
      setForm((f) => ({
        ...f,
        name: f.name || displayName,
        email: f.email || user.email || "",
      }));
    });

    return () => { active = false; };
  }, [open, supabase]);

  // ── Fetch best bank rate ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    void fetch("/api/bank-offers")
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        if (!Array.isArray(payload?.data)) return;
        const sorted = [...(payload.data as BankOffer[])].sort((a, b) => a.interestRate - b.interestRate);
        if (sorted[0]) setBestRate(sorted[0].interestRate);
      })
      .catch(() => null);
  }, [open]);

  // ── Finance breakdown ───────────────────────────────────────────────────────
  const finance = useMemo(() => {
    if (!vehicle) return null;
    return runFinanceEngine({
      vehiclePrice: vehicle.price,
      batteryKWh:   vehicle.batteryKWh,
      rangeKm:      vehicle.rangeKm,
      aprPct:       bestRate ?? undefined,
    });
  }, [vehicle, bestRate]);

  // ── Keyboard + scroll lock ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  function handleClose() {
    if (submitting) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setForm({ name: "", email: "", phone: "", message: "" });
    setFieldErrors({});
    setServerError(null);
    setSuccess(false);
    onClose();
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) handleClose();
  }

  function validate() {
    const errors: typeof fieldErrors = {};
    if (form.name.trim().length < 2) errors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Please enter a valid email address.";
    if (form.phone.trim().length < 7) errors.phone = "Please enter a valid phone number.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !finance) return;
    setSubmitting(true);
    setServerError(null);

    const breakdown = [
      `Vehicle: ${vehicle.brand} ${vehicle.model}`,
      `Full price: ${fmt(vehicle.price)}`,
      `Suggested deposit (10%): ${fmt(finance.suggestedDepositGbp)}`,
      `Loan amount: ${fmt(vehicle.price - finance.suggestedDepositGbp)}`,
      `Finance APR: ${finance.aprPct}% (best available bank rate)`,
      `Term: ${finance.termMonths} months`,
      `Monthly finance (EMI): ${fmtDec(finance.estimatedEmi)}`,
      `Monthly insurance est.: ${fmtDec(finance.breakdown.insuranceMonthlyGbp)}`,
      `Monthly charging est.: ${fmtDec(finance.breakdown.chargingMonthlyGbp)}`,
      `Total estimated monthly: ${fmtDec(finance.totalEstimatedMonthlyCost)}`,
      `Total repayable: ${fmt(finance.totalRepayableGbp)}`,
      `Compared against: ${modelA.brand} ${modelA.model} vs ${modelB.brand} ${modelB.model}`,
    ].join("\n");

    const message = form.message.trim()
      ? `${form.message.trim()}\n\n---\n${breakdown}`
      : breakdown;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name,
          email:         form.email,
          phone:         form.phone,
          vehicle_id:    vehicle.id,
          vehicle_label: `${vehicle.brand} ${vehicle.model}`,
          interest_type: "quote",
          message,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setFieldErrors(payload?.fieldErrors ?? {});
        setServerError(payload?.error ?? "Unable to send your request right now.");
        return;
      }

      setSuccess(true);
      closeTimerRef.current = window.setTimeout(handleClose, 1800);
    } catch {
      setServerError("Unable to send your request right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const vehicleLabel = `${vehicle.brand} ${vehicle.model}`;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B0F12] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/8 bg-white/[0.03] px-6 py-5 md:px-8">
          <div className="pr-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
              Quotation request
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{vehicleLabel}</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-zinc-400">
              Full pricing breakdown included — we&apos;ll confirm availability and the best deal within 24 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center md:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <BadgeCheck className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-white">Quotation sent</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-400">
              We&apos;ve received your request including the full pricing breakdown. Expect a follow-up shortly.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 md:px-8">
              <Field
                label="Full name" value={form.name} required
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Jane Smith" error={fieldErrors.name}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Email" type="email" value={form.email} required
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  placeholder="jane@example.com" error={fieldErrors.email}
                />
                <Field
                  label="Phone" type="tel" value={form.phone} required
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  placeholder="+44 7700 000000" error={fieldErrors.phone}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Additional notes <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={3}
                  placeholder="Preferred deposit, trade-in, colour…"
                  className="w-full resize-none rounded-[1.25rem] border border-white/10 bg-[#0F1518] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/35"
                />
              </div>

              {serverError && (
                <div className="rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !finance}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send Quotation Request"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Pricing breakdown panel */}
            <div className="border-t border-white/8 bg-white/[0.02] px-6 py-6 lg:border-l lg:border-t-0 md:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 mb-4">
                Pricing breakdown
              </p>

              {finance ? (
                <div className="space-y-2.5">
                  <PriceLine label="Vehicle price" value={fmt(finance.vehiclePrice)} highlight />
                  <PriceLine label="Suggested deposit (10%)" value={fmt(finance.suggestedDepositGbp)} />
                  <PriceLine label="Loan amount" value={fmt(finance.vehiclePrice - finance.suggestedDepositGbp)} />
                  <div className="my-3 border-t border-white/8" />
                  <PriceLine label={`Finance APR (best rate${bestRate ? ` · ${bestRate}%` : ""})`} value={`${fmtDec(finance.estimatedEmi)}/mo`} />
                  <PriceLine label="Insurance est." value={`${fmtDec(finance.breakdown.insuranceMonthlyGbp)}/mo`} />
                  <PriceLine label="Charging est." value={`${fmtDec(finance.breakdown.chargingMonthlyGbp)}/mo`} />
                  <div className="my-3 border-t border-white/8" />
                  <PriceLine label="Est. total monthly" value={`${fmtDec(finance.totalEstimatedMonthlyCost)}/mo`} highlight />
                  <PriceLine label={`Total repayable (${finance.termMonths} mo)`} value={fmt(finance.totalRepayableGbp)} />
                </div>
              ) : (
                <div className="space-y-2.5 animate-pulse">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-5 rounded bg-white/5" />
                  ))}
                </div>
              )}

              <p className="mt-4 text-[11px] leading-5 text-zinc-600">
                Estimates only. Finance based on {finance?.termMonths ?? 48}-month PCP, 10% deposit, best available APR. Insurance and charging are indicative UK averages.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, error, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; error?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">
        {label}{required && <span className="ml-1 text-emerald-300">*</span>}
      </label>
      <input
        type={type} value={value} required={required} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[1.25rem] border bg-[#0F1518] px-4 py-3 text-sm text-white outline-none transition ${
          error ? "border-rose-400/40" : "border-white/10 focus:border-emerald-400/35"
        }`}
      />
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function PriceLine({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${highlight ? "font-semibold text-white" : "text-zinc-400"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${highlight ? "text-emerald-300" : "text-zinc-200"}`}>{value}</span>
    </div>
  );
}
