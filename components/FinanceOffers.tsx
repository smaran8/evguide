"use client";

import { useEffect, useMemo, useState } from "react";
import { BankOffer, EVModel } from "@/types";

function monthly(principal: number, annualRate: number, years: number) {
  const m = annualRate / 12 / 100;
  const n = years * 12;

  if (!principal || !n) return 0;
  if (m === 0) return principal / n;

  return (principal * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

type RankedBankOffer = BankOffer & {
  monthly: number;
};

export default function FinanceOffers({
  model,
  offers,
  selectedBank,
  onSelectBank,
}: {
  model: EVModel | null;
  offers: BankOffer[];
  selectedBank: BankOffer | null;
  onSelectBank: (offer: BankOffer) => void;
}) {
  const [downPayment, setDownPayment] = useState(5000);
  const [tenure, setTenure] = useState(5);

  const vehiclePrice = model?.price ?? 0;
  const loanAmount = Math.max(vehiclePrice - downPayment, 0);

  const ranked: RankedBankOffer[] = useMemo(() => {
    if (!model) return [];

    return offers
      .map((offer) => {
        const allowedTenure = Math.min(tenure, offer.maxTenureYears || tenure);

        return {
          ...offer,
          monthly: monthly(loanAmount, offer.interestRate, allowedTenure),
        };
      })
      .sort((a, b) => a.monthly - b.monthly);
  }, [model, offers, loanAmount, tenure]);

  // Always resolve selected bank from latest ranked list
  const activeBank =
    ranked.find((bank) => bank.id === selectedBank?.id) || ranked[0] || null;

  // Auto-select best offer when model loads or when selected bank is missing
  useEffect(() => {
    if (!ranked.length) return;

    const stillExists = ranked.some((bank) => bank.id === selectedBank?.id);

    if (!selectedBank || !stillExists) {
      onSelectBank(ranked[0]);
    }
  }, [ranked, selectedBank, onSelectBank]);

  if (!model) return null;

  const allowedTenure = activeBank
    ? Math.min(tenure, activeBank.maxTenureYears || tenure)
    : tenure;

  const currentEmi = activeBank
    ? Math.round(monthly(loanAmount, activeBank.interestRate, allowedTenure))
    : 0;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-semibold text-blue-600">Finance options</p>
        <h1 className="mt-2 text-4xl font-bold">
          Best finance offers for {model.brand} {model.model}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Choose a bank, adjust down payment and tenure, and see the updated EMI
          instantly.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">EMI Calculator</h2>

            <div className="mt-6 space-y-6">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm text-slate-500">Vehicle price</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  £{model.price.toLocaleString()}
                </p>
              </div>

              <div>
                <label
                  htmlFor="bank"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Choose Bank
                </label>
                <select
                  id="bank"
                  value={activeBank?.id || ""}
                  onChange={(e) => {
                    const bank = ranked.find((item) => item.id === e.target.value);
                    if (bank) {
                      onSelectBank(bank);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {ranked.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bank} — {bank.interestRate}% interest
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Down Payment
                </label>
                <input
                  type="range"
                  min={0}
                  max={model.price}
                  step={500}
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>£0</span>
                  <span className="font-semibold text-slate-900">
                    £{downPayment.toLocaleString()}
                  </span>
                  <span>£{model.price.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="tenure"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Loan Tenure
                </label>
                <select
                  id="tenure"
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value={1}>1 Year</option>
                  <option value={2}>2 Years</option>
                  <option value={3}>3 Years</option>
                  <option value={4}>4 Years</option>
                  <option value={5}>5 Years</option>
                  <option value={6}>6 Years</option>
                  <option value={7}>7 Years</option>
                </select>

                {activeBank && tenure > (activeBank.maxTenureYears || tenure) && (
                  <p className="mt-2 text-xs text-amber-600">
                    {activeBank.bank} supports up to {activeBank.maxTenureYears} years.
                    EMI is being calculated using that maximum tenure.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-sm text-slate-500">Loan amount</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    £{loanAmount.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-600 p-4 text-white">
                  <p className="text-sm text-blue-100">Estimated EMI</p>
                  <p className="mt-1 text-lg font-semibold">
                    £{currentEmi.toLocaleString()}/month
                  </p>
                  <p className="mt-1 text-xs text-blue-100">
                    Based on {activeBank?.bank || "selected bank"}
                  </p>
                </div>
              </div>

              {activeBank ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    Active Bank
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {activeBank.bank}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {activeBank.interestRate}% interest • up to{" "}
                    {activeBank.maxTenureYears} years
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Processing fee: {activeBank.processingFee || "N/A"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="grid gap-4">
              {ranked.map((offer, index) => {
                const isSelected = activeBank?.id === offer.id;

                return (
                  <div
                    key={offer.id}
                    className={`rounded-2xl border p-5 transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {offer.bank}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{offer.tag}</p>

                        {(offer.facilities ?? []).length > 0 ? (
                          <ul className="mt-2 text-xs text-slate-500">
                            {(offer.facilities ?? []).slice(0, 2).map((facility, i) => (
                              <li key={i}>• {facility}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            No facility details available
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-slate-500">Monthly</p>
                        <p className="font-semibold text-slate-900">
                          £{Math.round(offer.monthly).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {offer.interestRate}% interest
                        </p>
                        <p className="text-xs text-slate-500">
                          Fee: {offer.processingFee || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {(offer.terms ?? []).slice(0, 4).map((term, i) => (
                          <div key={i}>
                            <span className="font-medium">{term.label}:</span>{" "}
                            {term.value}
                          </div>
                        ))}

                        {(!offer.terms || offer.terms.length === 0) && (
                          <div className="col-span-2 text-slate-500">
                            No extra terms available
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectBank(offer)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select Bank"}
                      </button>
                    </div>

                    {index === 0 && !isSelected ? (
                      <span className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Best offer
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}