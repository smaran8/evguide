"use client";

import { useState } from "react";
import { BankOffer, EVModel, OfferFormState } from "@/types";

const initialState: OfferFormState = {
  fullName: "",
  email: "",
  preferredTime: "",
  consent: false,
  notes: "",
};

export default function OfferForm({
  model,
  bank,
}: {
  model: EVModel | null;
  bank: BankOffer | null;
}) {
  const [values, setValues] = useState<OfferFormState>(initialState);
  const [submitted, setSubmitted] = useState(false);

  if (!model || !bank) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.fullName || !values.email || !values.preferredTime || !values.consent) {
      return;
    }
    setSubmitted(true);
  };

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-semibold text-blue-600">Consultation form</p>
        <h2 className="mt-2 text-3xl font-bold">
          {model.brand} {model.model} → {bank.bank}
        </h2>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 max-w-2xl">
          <input
            placeholder="Full name"
            value={values.fullName}
            onChange={(e) => setValues({ ...values, fullName: e.target.value })}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
          <input
            placeholder="Email"
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
          <input
            type="datetime-local"
            value={values.preferredTime}
            onChange={(e) => setValues({ ...values, preferredTime: e.target.value })}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
          <textarea
            placeholder="Notes"
            value={values.notes}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <input
              type="checkbox"
              checked={values.consent}
              onChange={(e) => setValues({ ...values, consent: e.target.checked })}
            />
            <span>I agree to be contacted for a free consultation.</span>
          </label>
          <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
            Submit
          </button>
        </form>

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Success — your consultation request has been submitted.
          </div>
        ) : null}
      </div>
    </section>
  );
}