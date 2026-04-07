"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/tracking/client";

function calcEMI(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.round(principal / months);
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi);
}

export default function EMICalculatorPreview() {
  const pathname = usePathname();
  const [price, setPrice] = useState(35000);
  const [deposit, setDeposit] = useState(7000);
  const [months, setMonths] = useState(48);
  const [trackedUsage, setTrackedUsage] = useState(false);
  const annualRate = 6.9;

  const safeDeposit = Math.min(deposit, price - 1000);
  const principal = Math.max(0, price - safeDeposit);
  const monthly = useMemo(
    () => calcEMI(principal, annualRate, months),
    [principal, months]
  );
  const totalPayable = monthly * months + safeDeposit;
  const totalInterest = Math.max(0, totalPayable - price);

  function trackEmiUsedOnce(nextPrice: number, nextDeposit: number, nextMonths: number) {
    if (trackedUsage) return;
    setTrackedUsage(true);

    const nextPrincipal = Math.max(0, nextPrice - Math.min(nextDeposit, nextPrice - 1000));
    const nextEstimatedMonthlyEmi = calcEMI(nextPrincipal, annualRate, nextMonths);

    void trackEvent({
      eventType: "emi_used",
      pagePath: pathname || "/",
      eventValue: {
        price: nextPrice,
        deposit: nextDeposit,
        months: nextMonths,
        annual_rate: annualRate,
        estimated_monthly_emi: nextEstimatedMonthlyEmi,
      },
    });
  }

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">

          {/* ── Left: sliders ── */}
          <div>
            <p className="text-sm font-semibold text-blue-600">Finance Tool</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Estimate your monthly EV payment
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Adjust the sliders to see how price, deposit, and tenure change
              your monthly cost. No commitment required.
            </p>

            <div className="mt-8 space-y-7">
              {/* Price */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-700">Car Price</label>
                  <span className="font-bold text-slate-900">£{price.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={80000}
                  step={500}
                  value={price}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setPrice(next);
                    trackEmiUsedOnce(next, safeDeposit, months);
                  }}
                  className="mt-2 w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>£10,000</span>
                  <span>£80,000</span>
                </div>
              </div>

              {/* Deposit */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-700">Deposit</label>
                  <span className="font-bold text-slate-900">£{safeDeposit.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.min(price - 1000, 30000)}
                  step={500}
                  value={safeDeposit}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDeposit(next);
                    trackEmiUsedOnce(price, next, months);
                  }}
                  className="mt-2 w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>£0</span>
                  <span>£30,000</span>
                </div>
              </div>

              {/* Tenure */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-700">Loan Tenure</label>
                  <span className="font-bold text-slate-900">
                    {months} months ({(months / 12).toFixed(0)} yrs)
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={84}
                  step={12}
                  value={months}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setMonths(next);
                    trackEmiUsedOnce(price, safeDeposit, next);
                  }}
                  className="mt-2 w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>1 yr</span>
                  <span>7 yrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: result card ── */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 p-8 shadow-sm">
            <p className="text-sm font-semibold text-blue-600">Your estimate</p>
            <p className="mt-1 text-5xl font-extrabold text-slate-900">
              £{monthly.toLocaleString()}
              <span className="ml-1 text-xl font-medium text-slate-500">/month</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Based on {annualRate}% APR representative
            </p>

            <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {[
                { label: "Loan amount", value: `£${principal.toLocaleString()}` },
                { label: "Deposit", value: `£${safeDeposit.toLocaleString()}` },
                { label: "Total interest", value: `£${totalInterest.toLocaleString()}` },
                { label: "Total payable", value: `£${totalPayable.toLocaleString()}`, bold: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className={row.bold ? "font-bold text-slate-900" : "font-semibold text-slate-900"}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/finance"
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              View Finance Offers →
            </Link>
            <p className="mt-3 text-center text-xs text-slate-400">
              Representative estimate only. Subject to lender approval.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
