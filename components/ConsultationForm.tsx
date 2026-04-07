"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/tracking/client";
import LoginModal from "@/components/LoginModal";

const BANKS = [
  { id: "hsbc", label: "HSBC", detail: "7.9% fixed · 7 yrs · 85% LTV" },
  { id: "santander", label: "Santander", detail: "8.1% · 6 yrs · 80% LTV" },
  { id: "lloyds", label: "Lloyds", detail: "8.0% representative · 7 yrs · 82% LTV" },
];

type EVOption = { id: string; brand: string; model: string };

type Props = {
  evModels: EVOption[];
};

export default function ConsultationForm({ evModels }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [sector, setSector] = useState<"bank" | "vehicle" | null>(null);
  const [bankName, setBankName] = useState("");
  const [evModelId, setEvModelId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted) {
          setIsLoggedIn(Boolean(user));
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    loadAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      setError("Please log in to use consultation features.");
      setShowLoginModal(true);
      return;
    }

    if (!sector) { setError("Please choose a consultation type."); return; }
    if (sector === "bank" && !bankName) { setError("Please select a bank."); return; }
    if (sector === "vehicle" && !evModelId) { setError("Please select an EV model."); return; }

    let evModelLabel: string | undefined;
    if (sector === "vehicle" && evModelId) {
      const match = evModels.find((m) => m.id === evModelId);
      if (match) evModelLabel = `${match.brand} ${match.model}`;
    }

    const preferredDateTime =
      preferredDate && preferredTime ? `${preferredDate}T${preferredTime}` : undefined;

    setSubmitting(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          sector,
          bank_name: bankName || undefined,
          ev_model_id: evModelId || undefined,
          ev_model_label: evModelLabel,
          preferred_time: preferredDateTime,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong.");
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-green-200 bg-green-50 px-8 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
        <h3 className="text-xl font-bold text-green-800">Request Submitted!</h3>
        <p className="mt-2 text-green-700">
          Thank you, <strong>{fullName}</strong>. Our team will be in touch at{" "}
          <strong>{email}</strong> shortly.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Book a Consultation</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose a consultation type and fill in your details. We&apos;ll reach out to help you.
      </p>

      {!authLoading && !isLoggedIn ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">Login required</p>
          <p className="mt-2 text-sm text-amber-800">
            Please log in to access EV and finance consultation features on this page.
          </p>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Log in to continue
          </button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Sector selector */}
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">Consultation type</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: "bank", icon: "🏦", title: "Bank Finance", desc: "Get EV loan advice from our partner banks" },
                { key: "vehicle", icon: "⚡", title: "EV Vehicle", desc: "Personalised guidance on choosing an EV" },
              ] as const
            ).map(({ key, icon, title, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSector(key);
                  setBankName("");
                  setEvModelId("");
                  if (!hasTrackedStart.current) {
                    hasTrackedStart.current = true;
                    void trackEvent({
                      eventType: "consultation_started",
                      eventValue: { sector: key },
                    });
                  }
                }}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  sector === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-2xl">{icon}</span>
                <p className="mt-2 font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bank selector */}
        {sector === "bank" && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Select a bank <span className="text-red-500">*</span>
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— choose a bank —</option>
              {BANKS.map((b) => (
                <option key={b.id} value={b.label}>
                  {b.label} – {b.detail}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* EV model selector */}
        {sector === "vehicle" && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Select an EV model <span className="text-red-500">*</span>
            </label>
            <select
              value={evModelId}
              onChange={(e) => setEvModelId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— choose a model —</option>
              {evModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.model}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Personal info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Jane Smith"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jane@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 000000"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Preferred date
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Preferred time
            </label>
            <input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Additional notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any questions or specifics you'd like us to know…"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !sector || authLoading || !isLoggedIn}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Send consultation request"}
        </button>
      </form>
      )}
      </div>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setIsLoggedIn(true);
          setError("");
        }}
        title="Consultation Access"
        description="Sign in to request EV and finance consultation support."
      />
    </>
  );
}
