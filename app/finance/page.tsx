"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import LoginModal from "@/components/LoginModal";
import { bankOffers } from "@/data/bankOffers";
import { evModels } from "@/data/evModels";
import { mapDbEV, type DbEV } from "@/lib/ev-models";
import { createClient } from "@/lib/supabase/client";
import { BankOffer, EVModel } from "@/types";

function FinanceContent() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [offers, setOffers] = useState<BankOffer[]>(bankOffers);
  const [allModels, setAllModels] = useState<EVModel[]>(evModels);
  const [selectedCarId, setSelectedCarId] = useState(() => searchParams.get("car") ?? "");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankOffer | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [quoteDownPayment, setQuoteDownPayment] = useState(0);
  const [quoteTenure, setQuoteTenure] = useState(5);
  const formRef = useRef<HTMLElement>(null);

  // EMI calculator modal
  const [showEmi, setShowEmi] = useState(false);
  const [emiPrice, setEmiPrice] = useState("");
  const [emiDown, setEmiDown] = useState("");
  const [emiTenure, setEmiTenure] = useState("5");

  const emiRate = selectedBank?.interestRate ?? 0;
  const emiLoan = Math.max(0, parseFloat(emiPrice || "0") - parseFloat(emiDown || "0"));
  const emiMonthlyRate = emiRate / 100 / 12;
  const emiMonths = parseInt(emiTenure) * 12;
  const emiMonthly =
    emiLoan > 0 && emiMonthlyRate > 0
      ? (emiLoan * emiMonthlyRate * Math.pow(1 + emiMonthlyRate, emiMonths)) /
        (Math.pow(1 + emiMonthlyRate, emiMonths) - 1)
      : 0;
  const emiTotalInterest = emiMonthly > 0 ? emiMonthly * emiMonths - emiLoan : 0;

  const selectedModel = allModels.find((item) => item.id === selectedCarId) ?? null;
  const selectedVehiclePrice = selectedModel?.price ?? 0;
  const effectiveQuoteTenure = selectedBank
    ? Math.min(quoteTenure, selectedBank.maxTenureYears || quoteTenure)
    : quoteTenure;
  const clampedDownPayment = Math.min(Math.max(quoteDownPayment, 0), selectedVehiclePrice);
  const quoteLoanAmount = Math.max(selectedVehiclePrice - clampedDownPayment, 0);
  const quoteMonthlyRate = (selectedBank?.interestRate ?? 0) / 100 / 12;
  const quoteMonths = Math.max(effectiveQuoteTenure * 12, 1);
  const quoteMonthlyEmi =
    quoteLoanAmount > 0
      ? quoteMonthlyRate > 0
        ? (quoteLoanAmount * quoteMonthlyRate * Math.pow(1 + quoteMonthlyRate, quoteMonths)) /
          (Math.pow(1 + quoteMonthlyRate, quoteMonths) - 1)
        : quoteLoanAmount / quoteMonths
      : 0;
  const quoteTotalInterest = Math.max(quoteMonthlyEmi * quoteMonths - quoteLoanAmount, 0);
  const quoteTotalPayable = clampedDownPayment + quoteMonthlyEmi * quoteMonths;

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

  useEffect(() => {
    const queryCar = searchParams.get("car") ?? "";
    setSelectedCarId(queryCar);
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function loadOffers() {
      try {
        const res = await fetch("/api/bank-offers", { cache: "no-store" });
        if (!res.ok) return;

        const payload = await res.json();
        if (!mounted || !Array.isArray(payload?.data)) return;

        setOffers(payload.data);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOffers();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      try {
        const res = await fetch("/api/evs", { cache: "no-store" });
        if (!res.ok) return;

        const payload = await res.json();
        if (!mounted || !Array.isArray(payload?.data)) return;

        const mapped = payload.data
          .filter((item: Partial<DbEV>) => item?.id && item?.brand && item?.model)
          .map((item: DbEV) => mapDbEV(item));

        if (mapped.length > 0) {
          const merged = [
            ...mapped,
            ...evModels.filter((staticModel) => !mapped.some((db: EVModel) => db.id === staticModel.id)),
          ];
          setAllModels(merged);
        }
      } catch {
        // Keep static fallback models.
      }
    }

    loadModels();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedModel) {
      setQuoteDownPayment(0);
      return;
    }

    const suggestedDown = Math.round(selectedModel.price * 0.2);
    setQuoteDownPayment(suggestedDown);
    setEmiPrice(String(selectedModel.price));
    setEmiDown(String(suggestedDown));
  }, [selectedModel]);

  async function submitBankConsultation(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isLoggedIn) {
      setError("Please log in first to submit a bank consultation request.");
      setShowLoginModal(true);
      return;
    }

    if (!selectedBank) {
      setError("Please select a bank first.");
      return;
    }

    if (!selectedModel) {
      setError("Please select a vehicle to generate your quotation.");
      return;
    }

    const preferredDateTime =
      preferredDate && preferredTime ? `${preferredDate}T${preferredTime}` : undefined;

    const quotationSummary = [
      `Quotation for ${selectedModel.brand} ${selectedModel.model}`,
      `Vehicle price: GBP ${selectedVehiclePrice.toLocaleString()}`,
      `Down payment: GBP ${clampedDownPayment.toLocaleString()}`,
      `Loan amount: GBP ${quoteLoanAmount.toLocaleString()}`,
      `Selected bank: ${selectedBank.bank} (${selectedBank.interestRate}% APR)`,
      `Tenure: ${effectiveQuoteTenure} years`,
      `Estimated EMI: GBP ${Math.round(quoteMonthlyEmi).toLocaleString()} per month`,
      `Estimated total interest: GBP ${Math.round(quoteTotalInterest).toLocaleString()}`,
      `Estimated total payable: GBP ${Math.round(quoteTotalPayable).toLocaleString()}`,
    ].join("\n");

    const combinedNotes = [notes.trim(), quotationSummary].filter(Boolean).join("\n\n");

    setSubmitting(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector: "bank",
          bank_name: selectedBank.bank,
          ev_model_label: `${selectedModel.brand} ${selectedModel.model}`,
          full_name: fullName,
          email,
          phone,
          preferred_time: preferredDateTime,
          notes: combinedNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please log in first to submit a bank consultation request.");
          return;
        }
        setError(data.error || "Unable to submit consultation request.");
        return;
      }

      setSuccess("Your bank consultation request has been submitted successfully.");
      setFullName("");
      setEmail("");
      setPhone("");
      setPreferredDate("");
      setPreferredTime("");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-semibold text-blue-600">Loan Offers</p>
          <h1 className="mt-2 text-4xl font-bold">
            Compare Bank Loan Offers
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            View all available partner bank offers in one place. This page only shows
            bank loan details including interest rates and additional features.
          </p>

          {loading ? (
            <p className="mt-8 text-sm text-slate-500">Loading bank offers...</p>
          ) : null}

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => (
              <article
                key={offer.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{offer.bank}</p>
                    <p className="mt-1 text-sm text-slate-500">{offer.tag}</p>
                  </div>
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    {offer.interestRate}% APR
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Interest Rate
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{offer.interestRate}%</p>
                  <p className="mt-1 text-sm text-slate-600">Processing fee: {offer.processingFee}</p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Additional Features
                  </p>

                  {offer.facilities && offer.facilities.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {offer.facilities.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No additional features listed.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBank(offer);
                    setSuccess("");
                    setError("");
                    setTimeout(() => {
                      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }}
                  className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    selectedBank?.id === offer.id
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {selectedBank?.id === offer.id ? "Selected Bank" : "Select Bank"}
                </button>
              </article>
            ))}
          </div>

          {selectedBank ? (
            <section ref={formRef} className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-blue-600">Bank Consultant Form</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Request Consultation with {selectedBank.bank}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmiPrice("");
                    setEmiDown("");
                    setEmiTenure("5");
                    setShowEmi(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 13h.01M13 13h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                  Calculate EMI
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Fill out this form and our team will connect you with {selectedBank.bank} loan guidance.
              </p>

              <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Selected Vehicle
                  </label>
                  <select
                    value={selectedCarId}
                    onChange={(e) => {
                      setSelectedCarId(e.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                  >
                    <option value="">Choose an EV model</option>
                    {allModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.brand} {model.model}
                      </option>
                    ))}
                  </select>
                  {selectedModel ? (
                    <p className="mt-2 text-xs text-slate-600">
                      Vehicle price: GBP {selectedModel.price.toLocaleString()}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700">
                      Select a vehicle to generate your bank quotation.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Loan tenure
                  </label>
                  <select
                    value={quoteTenure}
                    onChange={(e) => setQuoteTenure(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((year) => (
                      <option key={year} value={year}>
                        {year} {year === 1 ? "year" : "years"}
                      </option>
                    ))}
                  </select>
                  {quoteTenure > (selectedBank.maxTenureYears || quoteTenure) ? (
                    <p className="mt-2 text-xs text-amber-700">
                      {selectedBank.bank} supports up to {selectedBank.maxTenureYears} years.
                      Quotation uses that maximum tenure.
                    </p>
                  ) : null}
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Down payment
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={selectedVehiclePrice}
                    step={500}
                    value={clampedDownPayment}
                    onChange={(e) => setQuoteDownPayment(Number(e.target.value))}
                    disabled={!selectedModel}
                    className="w-full"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span>GBP 0</span>
                    <span className="font-semibold text-slate-900">
                      GBP {clampedDownPayment.toLocaleString()}
                    </span>
                    <span>GBP {selectedVehiclePrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedModel ? (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-700">Loan Quotation</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {selectedModel.brand} {selectedModel.model} with {selectedBank.bank}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">Loan amount</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        GBP {Math.round(quoteLoanAmount).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-600 p-3">
                      <p className="text-xs text-blue-100">Monthly EMI</p>
                      <p className="mt-1 text-sm font-bold text-white">
                        GBP {Math.round(quoteMonthlyEmi).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">Total interest</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        GBP {Math.round(quoteTotalInterest).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">Total payable</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        GBP {Math.round(quoteTotalPayable).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!authLoading && !isLoggedIn ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-900">Login required</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Please log in to request finance consultation with {selectedBank.bank}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(true)}
                    className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Log in to continue
                  </button>
                </div>
              ) : (
              <form onSubmit={submitBankConsultation} className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Preferred date</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Preferred time</label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Additional notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  />
                </div>

                {error ? (
                  <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
                ) : null}

                {success ? (
                  <p className="sm:col-span-2 rounded-xl bg-green-50 px-4 py-2 text-sm text-green-700">{success}</p>
                ) : null}

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting || authLoading || !isLoggedIn}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : `Submit for ${selectedBank.bank}`}
                  </button>
                </div>
              </form>
              )}
            </section>
          ) : null}

          {!loading && offers.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No bank offers are available right now.</p>
          ) : null}

          <LoginModal
            open={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSuccess={() => {
              setIsLoggedIn(true);
              setError("");
            }}
            title="Access Finance Consultation"
            description="Sign in to request EV loan and bank consultation support."
          />
        </div>
      </section>

      {/* EMI Calculator Modal */}
      {showEmi ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmi(false); }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">EMI Calculator</p>
                <h3 className="mt-0.5 text-xl font-bold text-slate-900">{selectedBank?.bank}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmi(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Vehicle price (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 2500000"
                  value={emiPrice}
                  onChange={(e) => setEmiPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Down payment (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500000"
                  value={emiDown}
                  onChange={(e) => setEmiDown(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Loan tenure</label>
                <select
                  value={emiTenure}
                  onChange={(e) => setEmiTenure(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                    <option key={y} value={String(y)}>{y} {y === 1 ? "year" : "years"}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="text-sm text-slate-600">Interest rate (from {selectedBank?.bank})</span>
                <span className="ml-auto text-sm font-bold text-blue-700">{emiRate}% p.a.</span>
              </div>
            </div>

            {emiLoan > 0 && emiMonthly > 0 ? (
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Loan amount</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">₹{emiLoan.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="rounded-2xl bg-blue-600 p-3 text-center">
                  <p className="text-xs text-blue-200">Monthly EMI</p>
                  <p className="mt-1 text-sm font-bold text-white">₹{emiMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Total interest</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">₹{emiTotalInterest.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowEmi(false)}
              className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Skip — Fill consultation form
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function FinancePage() {
  return (
    <Suspense>
      <FinanceContent />
    </Suspense>
  );
}