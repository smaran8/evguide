"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/tracking/client";
import { createClient } from "@/lib/supabase/client";
import LoginPrompt from "@/components/auth/LoginPrompt";
import FinanceProgressIndicator from "./FinanceProgressIndicator";
import FinanceStepBankSelection from "./FinanceStepBankSelection";
import FinanceStepVehicleSelection from "./FinanceStepVehicleSelection";
import FinanceStepCalculator from "./FinanceStepCalculator";
import FinanceStepSummary from "./FinanceStepSummary";
import FinanceSuccessMessage from "./FinanceSuccessMessage";
import type { FinanceEnquirySummary, RunningCostEstimate } from "./financeUtils";
import type { BankOffer, EVModel } from "@/types";

interface FinanceEnquiryFlowProps {
  banks: BankOffer[];
  allModels: EVModel[];
  selectedBank: BankOffer | null;
  selectedBankId: string;
  onSelectBank: (bankId: string) => void;
  selectedVehicle: EVModel | null;
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
  carPrice: number;
  onCarPriceChange: (value: number) => void;
  deposit: number;
  onDepositChange: (value: number) => void;
  insuranceCost: number;
  onInsuranceCostChange: (value: number) => void;
  onResetInsuranceCost: () => void;
  processingFee: number;
  recommendedProcessingFee: number;
  onProcessingFeeChange: (value: number) => void;
  onResetProcessingFee: () => void;
  termYears: number;
  onTermYearsChange: (value: number) => void;
  apr: number;
  monthlyBudget: number;
  onMonthlyBudgetChange: (value: number) => void;
  includeBalloonPayment: boolean;
  onIncludeBalloonPaymentChange: (value: boolean) => void;
  balloonPercent: number;
  onBalloonPercentChange: (value: number) => void;
  summary: FinanceEnquirySummary;
  runningCost: RunningCostEstimate;
  monthlyOwnershipCost: number;
  onResetSelections: () => void;
}

type ContactForm = {
  name: string;
  email: string;
  phone: string;
};

type ContactField = keyof ContactForm;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FinanceEnquiryFlow({
  banks,
  allModels,
  selectedBank,
  selectedBankId,
  onSelectBank,
  selectedVehicle,
  selectedVehicleId,
  onSelectVehicle,
  carPrice,
  onCarPriceChange,
  deposit,
  onDepositChange,
  insuranceCost,
  onInsuranceCostChange,
  onResetInsuranceCost,
  processingFee,
  recommendedProcessingFee,
  onProcessingFeeChange,
  onResetProcessingFee,
  termYears,
  onTermYearsChange,
  apr,
  monthlyBudget,
  onMonthlyBudgetChange,
  includeBalloonPayment,
  onIncludeBalloonPaymentChange,
  balloonPercent,
  onBalloonPercentChange,
  summary,
  runningCost,
  monthlyOwnershipCost,
  onResetSelections,
}: FinanceEnquiryFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
  });
  const [contactErrors, setContactErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const bankCards = useMemo(() => {
    const sorted = [...banks].sort((a, b) => a.interestRate - b.interestRate);
    return sorted.map((bank, index) => ({
      ...bank,
      marketingNote:
        index === 0 ? "Lowest EMI" : index === 1 ? "Popular choice" : "Longer term",
    }));
  }, [banks]);

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = vehicleQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return allModels;
    }

    return allModels.filter((vehicle) =>
      `${vehicle.brand} ${vehicle.model}`.toLowerCase().includes(normalizedQuery),
    );
  }, [allModels, vehicleQuery]);

  const availableTermYears = useMemo(() => {
    const maxTenure = Math.max(2, selectedBank?.maxTenureYears ?? 5);
    return Array.from({ length: maxTenure - 1 }, (_value, index) => index + 2);
  }, [selectedBank]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
      if (user) {
        const name = (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || "";
        setContactForm((f) => ({ ...f, email: user.email ?? f.email, name: name || f.name }));
      }
    });
  }, []);

  useEffect(() => {
    if (termYears > (selectedBank?.maxTenureYears ?? termYears)) {
      onTermYearsChange(selectedBank?.maxTenureYears ?? termYears);
    }
  }, [onTermYearsChange, selectedBank, termYears]);

  function resetFlow() {
    onResetSelections();
    setCurrentStep(1);
    setVehicleQuery("");
    setContactForm({ name: "", email: "", phone: "" });
    setContactErrors({});
    setServerError(null);
    setSubmitting(false);
    setSubmitted(false);
  }

  function handleContactChange(field: ContactField, value: string) {
    setContactForm((current) => ({ ...current, [field]: value }));
    if (contactErrors[field]) {
      setContactErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }

    if (serverError) {
      setServerError(null);
    }
  }

  function validateContactForm() {
    const nextErrors: Partial<Record<ContactField, string>> = {};

    if (contactForm.name.trim().length < 2) {
      nextErrors.name = "Please enter your name.";
    }

    if (!EMAIL_REGEX.test(contactForm.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (contactForm.phone.trim().length < 7) {
      nextErrors.phone = "Please enter a valid phone number.";
    }

    setContactErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!selectedBank || !selectedVehicle) {
      setServerError("Please complete the finance flow before submitting.");
      return;
    }

    if (!validateContactForm()) {
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/finance-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          selected_bank: selectedBank.bank,
          selected_bank_interest_rate: apr,
          vehicle_id: selectedVehicle.id,
          vehicle_name: `${selectedVehicle.brand} ${selectedVehicle.model}`,
          vehicle_price: carPrice,
          down_payment: deposit,
          insurance_cost: insuranceCost,
          processing_fee: processingFee,
          total_insurance_cost: summary.totalInsuranceCost,
          loan_years: termYears,
          monthly_emi: summary.monthlyPayment,
          total_payable: summary.totalPayableAmount,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(payload?.error ?? "Unable to submit the finance enquiry right now.");
        return;
      }

      void trackEvent({
        eventType: "finance_apply_clicked",
        carId: selectedVehicle.id,
        eventValue: {
          selected_bank: selectedBank.bank,
          loan_years: termYears,
          monthly_emi: Math.round(summary.monthlyPayment),
        },
      });

      setSubmitted(true);
    } catch {
      setServerError("Unable to submit the finance enquiry right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-8">
      <FinanceProgressIndicator currentStep={submitted ? 4 : currentStep} />

      <div className="mt-6">
        {submitted ? (
          <FinanceSuccessMessage onReset={resetFlow} />
        ) : currentStep === 1 ? (
          <FinanceStepBankSelection
            banks={bankCards}
            selectedBankId={selectedBankId}
            onSelectBank={onSelectBank}
            onContinue={() => {
              if (selectedBankId) {
                setCurrentStep(2);
              }
            }}
          />
        ) : currentStep === 2 ? (
          <FinanceStepVehicleSelection
            vehicles={filteredVehicles}
            query={vehicleQuery}
            onQueryChange={setVehicleQuery}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
            onBack={() => setCurrentStep(1)}
            onContinue={() => {
              if (selectedVehicleId) {
                setCurrentStep(3);
              }
            }}
          />
        ) : currentStep === 3 && selectedBank && selectedVehicle ? (
          <FinanceStepCalculator
            selectedBank={selectedBank}
            selectedVehicle={selectedVehicle}
            carPrice={carPrice}
            onCarPriceChange={onCarPriceChange}
            deposit={deposit}
            onDepositChange={onDepositChange}
            insuranceCost={insuranceCost}
            onInsuranceCostChange={onInsuranceCostChange}
            onResetInsuranceCost={onResetInsuranceCost}
            processingFee={processingFee}
            recommendedProcessingFee={recommendedProcessingFee}
            onProcessingFeeChange={onProcessingFeeChange}
            onResetProcessingFee={onResetProcessingFee}
            monthlyBudget={monthlyBudget}
            onMonthlyBudgetChange={onMonthlyBudgetChange}
            includeBalloonPayment={includeBalloonPayment}
            onIncludeBalloonPaymentChange={onIncludeBalloonPaymentChange}
            balloonPercent={balloonPercent}
            onBalloonPercentChange={onBalloonPercentChange}
            summary={summary}
            runningCost={runningCost}
            monthlyOwnershipCost={monthlyOwnershipCost}
            termYearsPreview={termYears}
            onBack={() => setCurrentStep(2)}
            onContinue={() => setCurrentStep(4)}
          />
        ) : selectedBank && selectedVehicle ? (
          authed === false ? (
            <div className="mx-auto max-w-md py-8">
              <LoginPrompt action="submit your finance enquiry" returnTo="/finance" />
            </div>
          ) : (
            <FinanceStepSummary
              selectedBank={selectedBank}
              selectedVehicle={selectedVehicle}
              termYears={termYears}
              availableTermYears={availableTermYears}
              onTermYearsChange={onTermYearsChange}
              summary={summary}
              insuranceCost={insuranceCost}
              processingFee={processingFee}
              form={contactForm}
              errors={contactErrors}
              serverError={serverError}
              submitting={submitting}
              onFormChange={handleContactChange}
              onBack={() => setCurrentStep(3)}
              onSubmit={handleSubmit}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
