"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import ConsultationStep from "@/components/consultation/ConsultationStep";
import StepReason from "@/components/consultation/steps/StepReason";
import StepBudget from "@/components/consultation/steps/StepBudget";
import StepUsage from "@/components/consultation/steps/StepUsage";
import StepCharging from "@/components/consultation/steps/StepCharging";
import StepPreferences from "@/components/consultation/steps/StepPreferences";
import { createConsultation, updateConsultation } from "@/lib/consultation";
import { usePlatformTrack } from "@/hooks/usePlatformTrack";
import {
  CONSULTATION_STEPS,
  EMPTY_CONSULTATION,
  type ConsultationFormState,
  type ConsultationAnswerPayload,
} from "@/types/consultation";

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, state: ConsultationFormState): string | null {
  switch (step) {
    case 1:
      return state.main_reason_for_ev
        ? null
        : "Please select your main reason for going electric.";
    case 2:
      if (!state.budget_max_gbp || state.budget_max_gbp <= 0)
        return "Please enter your maximum budget.";
      if (
        state.budget_min_gbp != null &&
        state.budget_min_gbp > 0 &&
        state.budget_min_gbp >= state.budget_max_gbp
      )
        return "Minimum budget must be less than the maximum.";
      return null;
    case 3:
      return state.daily_miles != null && state.daily_miles > 0
        ? null
        : "Please enter your typical daily mileage.";
    case 4:
      return state.home_charging !== null
        ? null
        : "Please let us know if you have home charging.";
    case 5:
      return null; // All fields optional
    default:
      return null;
  }
}

// ── Build consultation_answers rows for a given step ─────────────────────────

function buildAnswers(
  step: number,
  state: ConsultationFormState,
): ConsultationAnswerPayload[] {
  switch (step) {
    case 1:
      return [
        {
          question_key: "main_reason_for_ev",
          step_number: 1,
          answer_text: state.main_reason_for_ev || null,
        },
      ];
    case 2:
      return [
        { question_key: "budget_min_gbp", step_number: 2, answer_number: state.budget_min_gbp },
        { question_key: "budget_max_gbp", step_number: 2, answer_number: state.budget_max_gbp },
        {
          question_key: "target_monthly_payment_gbp",
          step_number: 2,
          answer_number: state.target_monthly_payment_gbp,
        },
      ];
    case 3:
      return [
        { question_key: "daily_miles", step_number: 3, answer_number: state.daily_miles },
        { question_key: "weekly_miles", step_number: 3, answer_number: state.weekly_miles },
        { question_key: "yearly_miles", step_number: 3, answer_number: state.yearly_miles },
        { question_key: "family_size", step_number: 3, answer_number: state.family_size },
      ];
    case 4:
      return [
        {
          question_key: "home_charging",
          step_number: 4,
          answer_boolean: state.home_charging,
        },
        {
          question_key: "public_charging_ok",
          step_number: 4,
          answer_boolean: state.public_charging_ok,
        },
        {
          question_key: "charging_speed_importance",
          step_number: 4,
          answer_text: state.charging_speed_importance,
        },
      ];
    case 5:
      return [
        {
          question_key: "body_type_preference",
          step_number: 5,
          answer_text: state.body_type_preference,
        },
        {
          question_key: "brand_preference",
          step_number: 5,
          answer_json: state.brand_preference,
        },
        {
          question_key: "range_priority",
          step_number: 5,
          answer_text: state.range_priority,
        },
        {
          question_key: "performance_priority",
          step_number: 5,
          answer_text: state.performance_priority,
        },
        {
          question_key: "notes",
          step_number: 5,
          answer_text: state.notes || null,
        },
      ];
    default:
      return [];
  }
}

// ── Wizard ────────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the wizard completes. Receives the consultation ID and final state. */
  onComplete?: (consultationId: string | null, state: ConsultationFormState) => void;
  /** Called when the user closes/cancels the wizard (e.g. from a modal). */
  onClose?: () => void;
}

export default function ConsultationWizard({ onComplete, onClose }: Props) {
  const [step, setStep] = useState(0); // 0 = intro screen
  const [state, setState] = useState<ConsultationFormState>(EMPTY_CONSULTATION);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const track = usePlatformTrack();

  const updateState = useCallback((partial: Partial<ConsultationFormState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Start ───────────────────────────────────────────────────────────────────

  async function handleStart() {
    track("opened_consultation_popup");

    setSaving(true);
    const id = await createConsultation();
    setSaving(false);

    setConsultationId(id);
    setStep(1);

    track("started_consultation", {
      metadata: { consultation_id: id ?? "unknown" },
    });
  }

  // ── Continue / Submit ───────────────────────────────────────────────────────

  async function handleContinue() {
    const validationError = validateStep(step, state);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSaving(true);

    // Save the step's fields + answers to the DB (best-effort)
    if (consultationId) {
      const stepFields = getStepFields(step, state);
      await updateConsultation(consultationId, {
        ...stepFields,
        answers: buildAnswers(step, state),
      });
    }

    track("answered_consultation_question", {
      metadata: {
        step,
        step_key: CONSULTATION_STEPS[step - 1]?.answerKey,
        consultation_id: consultationId ?? undefined,
      },
    });

    setSaving(false);

    if (step < CONSULTATION_STEPS.length) {
      setStep((prev) => prev + 1);
    }
  }

  // ── Submit (final step) ─────────────────────────────────────────────────────

  async function handleSubmit() {
    const validationError = validateStep(step, state);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSaving(true);

    if (consultationId) {
      const stepFields = getStepFields(step, state);
      await updateConsultation(consultationId, {
        ...stepFields,
        answers: buildAnswers(step, state),
      });
    }

    track("completed_consultation", {
      metadata: { consultation_id: consultationId ?? "unknown" },
    });

    setSaving(false);
    setDone(true);

    onComplete?.(consultationId, state);
  }

  // ── Back ────────────────────────────────────────────────────────────────────

  function handleBack() {
    setError(null);
    if (step > 1) setStep((prev) => prev - 1);
    else setStep(0);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLastStep = step === CONSULTATION_STEPS.length;
  const currentStepConfig = CONSULTATION_STEPS[step - 1];

  // Completion screen
  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#D1F2EB] bg-[#E8F8F5]">
          <CheckCircle2 className="h-8 w-8 text-[#1FBF9F]" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[#1A1A1A]">
            We have everything we need
          </h2>
          <p className="mt-3 max-w-sm text-base leading-7 text-[#6B7280]">
            Your consultation has been saved. Our AI will use your answers to match
            you to the best EVs for your life.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={
              consultationId
                ? `/consultation/results?consultation_id=${consultationId}`
                : "/consultation"
            }
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1FBF9F] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#17A589]"
          >
            <Sparkles className="h-4 w-4" />
            See My EV Matches
          </a>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-7 py-3 text-sm font-medium text-[#374151] transition hover:border-[#1FBF9F]/40"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // Intro screen
  if (step === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#D1F2EB] bg-[#E8F8F5]">
            <Sparkles className="h-5 w-5 text-[#1FBF9F]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1FBF9F]">
              EV Consultation
            </p>
            <p className="mt-0.5 text-lg font-semibold text-[#1A1A1A]">
              Let&apos;s find your perfect match
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F8FAF9] p-5">
          <p className="text-sm leading-7 text-[#4B5563]">
            Answer <strong className="text-[#1A1A1A]">5 quick questions</strong> about your
            budget, daily use, and preferences. We&apos;ll use your answers to match you to the
            right EVs and calculate real monthly costs.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium text-[#6B7280]">
            {CONSULTATION_STEPS.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F8F5] text-[10px] font-bold text-[#1FBF9F]">
                  {s.id}
                </span>
                {s.title}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1FBF9F] px-8 py-4 text-base font-semibold text-white shadow-md transition hover:bg-[#17A589] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Start Consultation
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ConsultationStep
        currentStep={step}
        title={currentStepConfig!.title}
        subtitle={currentStepConfig!.subtitle}
        error={error}
      >
        {step === 1 && <StepReason state={state} onChange={updateState} />}
        {step === 2 && <StepBudget state={state} onChange={updateState} />}
        {step === 3 && <StepUsage state={state} onChange={updateState} />}
        {step === 4 && <StepCharging state={state} onChange={updateState} />}
        {step === 5 && <StepPreferences state={state} onChange={updateState} />}
      </ConsultationStep>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-medium text-[#374151] transition hover:border-[#1FBF9F]/40 hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          type="button"
          onClick={isLastStep ? handleSubmit : handleContinue}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[#1FBF9F] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17A589] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLastStep ? (
            "Submit"
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Helper: extract DB fields for each step ───────────────────────────────────

function getStepFields(
  step: number,
  state: ConsultationFormState,
): Partial<ConsultationFormState> {
  switch (step) {
    case 1:
      return { main_reason_for_ev: state.main_reason_for_ev };
    case 2:
      return {
        budget_min_gbp: state.budget_min_gbp,
        budget_max_gbp: state.budget_max_gbp,
        target_monthly_payment_gbp: state.target_monthly_payment_gbp,
      };
    case 3:
      return {
        daily_miles: state.daily_miles,
        weekly_miles: state.weekly_miles,
        yearly_miles: state.yearly_miles,
        family_size: state.family_size,
      };
    case 4:
      return {
        home_charging: state.home_charging,
        public_charging_ok: state.public_charging_ok,
      };
    case 5:
      return {
        body_type_preference: state.body_type_preference,
        brand_preference: state.brand_preference,
        range_priority: state.range_priority,
        performance_priority: state.performance_priority,
        notes: state.notes,
      };
    default:
      return {};
  }
}
