"use client";

import { useEffect, useMemo, useState } from "react";
import LoginPrompt from "@/components/auth/LoginPrompt";
import { Download, Landmark, ShieldCheck, X } from "lucide-react";
import { bankOffers } from "@/data/bankOffers";
import { createClient } from "@/lib/supabase/client";
import type { BankOffer } from "@/types";
import type { MatchResult } from "./recommendationEngine";

interface RecommendationQuoteModalProps {
  result: MatchResult;
  onClose: () => void;
}

interface QuoteSummary {
  vehiclePrice: number;
  deposit: number;
  loanAmount: number;
  termYears: number;
  monthlyPayment: number;
  totalInterest: number;
  processingFeeAmount: number;
  totalRepayable: number;
}

export default function RecommendationQuoteModal({ result, onClose }: RecommendationQuoteModalProps) {
  const [selectedBankId, setSelectedBankId] = useState(bankOffers[0]?.id ?? "");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedBank = useMemo(
    () => bankOffers.find((bank) => bank.id === selectedBankId) ?? bankOffers[0],
    [selectedBankId],
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true);
        setEmail(user.email ?? "");
        const displayName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          "";
        setFullName(displayName);
      }
      setCheckingAuth(false);
    });
  }, []);

  const quote = useMemo(() => buildQuote(result, selectedBank), [result, selectedBank]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedBank) {
      setError("Please choose a bank first.");
      return;
    }

    if (!isLoggedIn) {
      setError("Please log in before saving a bank quotation.");
      return;
    }

    setSubmitting(true);

    const quotationNotes = [
      `Vehicle: ${result.model.brand} ${result.model.model}`,
      `Match score: ${result.matchScore}%`,
      `Quoted bank: ${selectedBank.bank}`,
      `Vehicle price: GBP ${quote.vehiclePrice.toLocaleString()}`,
      `Deposit: GBP ${quote.deposit.toLocaleString()}`,
      `Loan amount: GBP ${quote.loanAmount.toLocaleString()}`,
      `APR: ${selectedBank.interestRate}%`,
      `Loan term: ${quote.termYears} years`,
      `Estimated monthly payment: GBP ${quote.monthlyPayment.toLocaleString()}`,
      `Estimated total interest: GBP ${quote.totalInterest.toLocaleString()}`,
      `Processing fee: GBP ${quote.processingFeeAmount.toLocaleString()}`,
      `Estimated total repayable: GBP ${quote.totalRepayable.toLocaleString()}`,
    ].join("\n");

    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          sector: "bank",
          bank_name: selectedBank.bank,
          notes: quotationNotes,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Unable to save this quotation right now.");
        setSubmitting(false);
        return;
      }

      downloadQuotation({
        consultationId: payload.id,
        bank: selectedBank,
        result,
        quote,
        customer: { fullName, email, phone },
      });

      setSuccess(`Illustrative estimate saved and downloaded for ${selectedBank.bank}.`);
      setTimeout(() => onClose(), 250);
    } catch {
      setError("Unable to generate the quotation right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B0F12] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between border-b border-white/8 bg-white/[0.03] px-6 py-5 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Illustrative finance estimate</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {result.model.brand} {result.model.model}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Choose a lender profile, save your estimate, and download the calculation instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-white/8 p-6 md:p-8 lg:border-b-0 lg:border-r">
            <div>
              <p className="text-sm font-medium text-white">Choose a lender profile</p>
              <div className="mt-4 grid gap-3">
                {bankOffers.map((bank) => {
                  const active = bank.id === selectedBankId;
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`rounded-[1.5rem] border p-4 text-left transition ${
                        active
                          ? "border-emerald-400/35 bg-emerald-400/10"
                          : "border-white/8 bg-white/[0.03] hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-white">{bank.bank}</p>
                          <p className="mt-1 text-sm text-zinc-400">{bank.tag}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Illustrative APR</p>
                          <p className="mt-1 text-base font-semibold text-emerald-300">{bank.interestRate}%</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {checkingAuth ? (
              <div className="mt-8 flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
              </div>
            ) : !isLoggedIn ? (
              <div className="mt-8">
                <LoginPrompt action="save & download this estimate" returnTo="/ai-match" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField label="Full name" value={fullName} onChange={setFullName} required />
                  <InputField label="Email" type="email" value={email} onChange={setEmail} required />
                </div>
                <InputField label="Phone" value={phone} onChange={setPhone} />

                {error ? <div className="rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div> : null}
                {success ? <div className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</div> : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {submitting ? "Saving estimate..." : "Save & Download Estimate"}
                </button>
              </form>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Estimate Summary</p>
                  <p className="mt-1 text-lg font-semibold text-white">{selectedBank?.bank}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <QuoteRow label="Vehicle price" value={`GBP${quote.vehiclePrice.toLocaleString()}`} />
                <QuoteRow label="Deposit" value={`GBP${quote.deposit.toLocaleString()}`} />
                <QuoteRow label="Loan amount" value={`GBP${quote.loanAmount.toLocaleString()}`} />
                <QuoteRow label="Term" value={`${quote.termYears} years`} />
                <QuoteRow label="Monthly payment" value={`GBP${quote.monthlyPayment.toLocaleString()}`} highlight />
                <QuoteRow label="Total interest" value={`GBP${quote.totalInterest.toLocaleString()}`} />
                <QuoteRow label="Processing fee" value={`GBP${quote.processingFeeAmount.toLocaleString()}`} />
                <QuoteRow label="Total repayable" value={`GBP${quote.totalRepayable.toLocaleString()}`} />
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                <p className="text-sm leading-6 text-zinc-400">
                  This estimate is generated automatically from the selected lender profile, a standard deposit assumption,
                  and your recommended EV match. It is for research only, is not a credit decision or binding offer, and should be verified independently before you act.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildQuote(result: MatchResult, bank: BankOffer): QuoteSummary {
  const vehiclePrice = result.usedPrice;
  const minimumDeposit = Math.round(vehiclePrice * ((100 - bank.maxLtvPercent) / 100));
  const deposit = Math.max(minimumDeposit, Math.round(vehiclePrice * 0.15));
  const loanAmount = Math.max(0, vehiclePrice - deposit);
  const termYears = Math.min(5, bank.maxTenureYears);
  const months = termYears * 12;
  const monthlyRate = bank.interestRate / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? loanAmount / months
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
  const totalInterest = Math.max(0, monthlyPayment * months - loanAmount);
  const processingFeeAmount = Math.round(loanAmount * (parseFloat(bank.processingFee) / 100));
  const totalRepayable = deposit + monthlyPayment * months + processingFeeAmount;

  return {
    vehiclePrice,
    deposit,
    loanAmount,
    termYears,
    monthlyPayment: Math.round(monthlyPayment),
    totalInterest: Math.round(totalInterest),
    processingFeeAmount,
    totalRepayable: Math.round(totalRepayable),
  };
}

function downloadQuotation({
  consultationId,
  bank,
  result,
  quote,
  customer,
}: {
  consultationId: string;
  bank: BankOffer;
  result: MatchResult;
  quote: QuoteSummary;
  customer: { fullName: string; email: string; phone: string };
}) {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>EV Finance Estimate - ${bank.bank}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#071015;color:#e5f0ef;padding:32px;}
.wrapper{max-width:760px;margin:0 auto;background:#0d161b;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;}
.header{padding:32px;background:linear-gradient(135deg,#0f2e29,#08171c);}
.badge{display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid rgba(52,211,153,.3);color:#6ee7b7;font-size:12px;text-transform:uppercase;letter-spacing:.18em;}
h1{margin:16px 0 0;font-size:32px;}
p{color:#9fb1b5;line-height:1.6;}
.section{padding:28px 32px;border-top:1px solid rgba(255,255,255,.06);}
.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);}
.row:last-child{border-bottom:none;}
.value{font-weight:700;color:#fff;}
.highlight{color:#6ee7b7;font-size:28px;}
.small{font-size:12px;color:#7c9196;}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <span class="badge">Illustrative estimate</span>
    <h1>${result.model.brand} ${result.model.model}</h1>
    <p>Reference: ${consultationId}<br/>Bank: ${bank.bank}<br/>Customer: ${customer.fullName} (${customer.email})</p>
  </div>
  <div class="section">
    <div class="row"><span>Vehicle price</span><span class="value">GBP ${quote.vehiclePrice.toLocaleString()}</span></div>
    <div class="row"><span>Deposit</span><span class="value">GBP ${quote.deposit.toLocaleString()}</span></div>
    <div class="row"><span>Loan amount</span><span class="value">GBP ${quote.loanAmount.toLocaleString()}</span></div>
    <div class="row"><span>APR</span><span class="value">${bank.interestRate}%</span></div>
    <div class="row"><span>Term</span><span class="value">${quote.termYears} years</span></div>
    <div class="row"><span>Estimated monthly payment</span><span class="value highlight">GBP ${quote.monthlyPayment.toLocaleString()}</span></div>
    <div class="row"><span>Total interest</span><span class="value">GBP ${quote.totalInterest.toLocaleString()}</span></div>
    <div class="row"><span>Processing fee</span><span class="value">GBP ${quote.processingFeeAmount.toLocaleString()}</span></div>
    <div class="row"><span>Total repayable</span><span class="value">GBP ${quote.totalRepayable.toLocaleString()}</span></div>
  </div>
  <div class="section">
    <p>Why this EV fits: ${result.whyItFits.join(" ")}</p>
    <p class="small">This document is an automated estimate based on an illustrative lender profile and the recommendation result shown in EV Guide AI. It is not a binding offer, regulated advice, or credit approval.</p>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${result.model.brand}-${result.model.model}-${bank.bank}-quotation.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-2xl border border-white/10 bg-[#0A1216] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
      />
    </div>
  );
}

function QuoteRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-black/20 px-4 py-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-semibold ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</span>
    </div>
  );
}
