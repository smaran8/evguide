"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoginModal from "@/components/LoginModal";
import { evModels } from "@/data/evModels";
import { trackEvent } from "@/lib/tracking/client";

type FormData = {
  fullName: string;
  email: string;
  preferredDate: string;
  preferredTime: string;
  carId: string;
  preferredLocation: string;
};

type IntentProfileLite = {
  intent_score: number;
  user_type: "casual" | "research" | "buyer";
  compare_count: number;
  visit_count: number;
  strongest_interest_car_id: string | null;
};

const EMPTY_FORM: FormData = {
  fullName: "",
  email: "",
  preferredDate: "",
  preferredTime: "",
  carId: "",
  preferredLocation: "",
};

export default function BookTestDriveWidget() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, setIntentProfile] = useState<IntentProfileLite | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setIsLoggedIn(Boolean(data.user));
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    void loadAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function loadIntentProfile() {
      try {
        const response = await fetch("/api/me/intent", { credentials: "same-origin" });
        const data = await response.json();
        if (!active) return;

        const profile = (data?.profile ?? null) as IntentProfileLite | null;
        setIntentProfile(profile);
        if (profile?.strongest_interest_car_id) {
          setFormData((current) =>
            current.carId
              ? current
              : { ...current, carId: profile.strongest_interest_car_id ?? "" }
          );
        }
      } catch {
        if (active) setIntentProfile(null);
      }
    }

    void loadIntentProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    const model = evModels.find((m) => m.id === formData.carId);

    setSubmitting(true);
    try {
      const res = await fetch("/api/test-drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          ev_model_id: formData.carId || null,
          ev_model_label: model ? `${model.brand} ${model.model}` : null,
          preferred_date: formData.preferredDate,
          preferred_time_slot: formData.preferredTime,
          preferred_location: formData.preferredLocation,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      void trackEvent({
        eventType: "test_drive_clicked",
        carId: formData.carId || null,
        eventValue: {
          source: "floating_test_drive_widget",
          preferred_location: formData.preferredLocation,
        },
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData(EMPTY_FORM);
        setOpen(false);
      }, 3500);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition";

  if (pathname.startsWith("/admin") || pathname === "/vehicles") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Book a test drive"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 active:translate-y-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223Z"
            clipRule="evenodd"
          />
        </svg>
        Book Test Drive
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Book a test drive"
        className={`fixed bottom-0 right-0 z-50 flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out sm:bottom-6 sm:right-6 sm:h-auto sm:max-h-[85vh] sm:w-[440px] sm:rounded-3xl ${
          open ? "translate-y-0" : "translate-y-full sm:translate-y-[120%]"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Test Drive Request
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Book Your Test Drive</h2>
            <p className="text-sm text-slate-500">
              Pick a vehicle, date, and time and we will contact you to confirm.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitted ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-emerald-600">
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Test Drive Requested</h3>
                <p className="mt-1 text-sm text-slate-600">
                  We&apos;ll contact you shortly to confirm your slot and vehicle availability.
                </p>
              </div>
            </div>
          ) : !authLoading && !isLoggedIn ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">Sign in to request a test drive.</p>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign In to Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="John Doe" className={inputCls} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Email <span className="text-red-500">*</span>
                </label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input type="date" name="preferredDate" value={formData.preferredDate} onChange={handleChange} required className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <select name="preferredTime" value={formData.preferredTime} onChange={handleChange} required className={inputCls}>
                    <option value="">Select</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Preferred Location <span className="text-red-500">*</span>
                </label>
                <input type="text" name="preferredLocation" value={formData.preferredLocation} onChange={handleChange} required placeholder="London showroom or nearest dealer" className={inputCls} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Interested EV <span className="text-red-500">*</span>
                </label>
                <select name="carId" value={formData.carId} onChange={handleChange} required className={inputCls}>
                  <option value="">Select EV</option>
                  {evModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand} {m.model}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Booking..." : "Request Test Drive"}
              </button>
            </form>
          )}
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setIsLoggedIn(true);
          setError("");
          setShowLoginModal(false);
        }}
        title="Sign in to book"
        description="Sign in to request a real EV test drive."
      />
    </>
  );
}
