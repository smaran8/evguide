"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import FinanceOffers from "@/components/FinanceOffers";
import { evModels } from "@/data/evModels";
import { bankOffers } from "@/data/bankOffers";
import { EVModel, BankOffer } from "@/types";

export default function FinancePage() {
  const [selectedModel, setSelectedModel] = useState<EVModel | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankOffer | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-semibold text-blue-600">EV Financing</p>
          <h1 className="mt-2 text-4xl font-bold">
            Find the best finance deals for your EV
          </h1>

          <div className="mt-8">
            <label className="block text-sm font-medium text-slate-700">
              Select your EV model
            </label>
            <select
              value={selectedModel?.id || ""}
              onChange={(e) => {
                const model = evModels.find((m) => m.id === e.target.value) || null;
                setSelectedModel(model);
                setSelectedBank(null);
              }}
              className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3"
            >
              <option value="">Choose an EV model</option>
              {evModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.brand} {model.model} - £{model.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {selectedBank && selectedModel ? (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">
                Selected Bank
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {selectedBank.bank}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {selectedBank.interestRate}% interest for{" "}
                {selectedModel.brand} {selectedModel.model}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <FinanceOffers
        model={selectedModel}
        offers={bankOffers}
        selectedBank={selectedBank}
        onSelectBank={setSelectedBank}
      />
    </main>
  );
}