"use client";
/* eslint-disable react/no-unescaped-entities */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LoginPrompt from "@/components/auth/LoginPrompt";

interface QuoteModalProps {
  vehicle: { id: string; brand: string; model: string; price: number };
  onClose: () => void;
}

export default function QuoteModal({ vehicle, onClose }: QuoteModalProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const overlayRef = useRef<HTMLDivElement>(null);

  // Mount guard — portals need the DOM
  useEffect(() => { setMounted(true); }, []);

  // Auth check + pre-fill
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
      if (user) {
        const name = (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || "";
        setForm((f) => ({ ...f, email: user.email ?? f.email, name: name || f.name }));
      }
    });
  }, []);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Please enter your name.");
    if (!form.email.trim() || !form.email.includes("@")) return setError("Please enter a valid email.");
    if (!form.phone.trim()) return setError("Please enter your phone number.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          vehicle_id: vehicle.id,
          interest_type: "quote",
          message: form.message.trim() || `Quote request for ${vehicle.brand} ${vehicle.model}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setDone(true);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl">

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Header always visible */}
          <div className="mb-5 pr-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Get a Quote</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h2>
            <p className="text-sm text-slate-500">
              Listed at GBP {vehicle.price.toLocaleString()} · We'll confirm the best price for you.
            </p>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="h-14 w-14 text-emerald-500" />
              <p className="text-lg font-bold text-slate-900">Quote request sent!</p>
              <p className="text-sm text-slate-500">
                We'll be in touch about the {vehicle.brand} {vehicle.model} shortly.
              </p>
            </div>
          ) : authed === null ? (
            /* Checking auth */
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !authed ? (
            /* Not logged in */
            <LoginPrompt action="request a quote" returnTo={`/vehicles`} />
          ) : (
            /* Logged in — show form */
            <>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name *"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
                <input
                  type="email"
                  placeholder="Email address *"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
                <input
                  type="tel"
                  placeholder="Phone number *"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
                <textarea
                  placeholder="Any questions or requirements? (optional)"
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send Quote Request"}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">Esc</kbd> or click outside to close
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
