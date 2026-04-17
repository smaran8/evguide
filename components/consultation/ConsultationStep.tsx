import type { ReactNode } from "react";
import { CONSULTATION_STEPS } from "@/types/consultation";

interface Props {
  currentStep: number; // 1-based
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
}

/**
 * Shared wrapper for every wizard step.
 * Renders: step counter, progress bar, title, subtitle, content, error message.
 */
export default function ConsultationStep({
  currentStep,
  title,
  subtitle,
  error,
  children,
}: Props) {
  const total = CONSULTATION_STEPS.length;
  const progress = (currentStep / total) * 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-[#6B7280]">
          <span>
            Step {currentStep} of {total}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {CONSULTATION_STEPS.map((step) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step.id <= currentStep ? "bg-[#1FBF9F]" : "bg-[#E5E7EB]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Heading */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1FBF9F]">
          Step {currentStep}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#1A1A1A] sm:text-3xl">{title}</h2>
        <p className="mt-2 text-base leading-7 text-[#6B7280]">{subtitle}</p>
      </div>

      {/* Step content */}
      <div>{children}</div>

      {/* Validation error */}
      {error && (
        <p className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Reusable option card ──────────────────────────────────────────────────────

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  description?: string;
}

export function OptionCard({ selected, onClick, icon, label, description }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-4 rounded-[1.5rem] border p-4 text-left transition-all duration-150 ${
        selected
          ? "border-[#1FBF9F] bg-[#E8F8F5] shadow-sm"
          : "border-[#E5E7EB] bg-white hover:border-[#1FBF9F]/40 hover:bg-[#F8FAF9]"
      }`}
    >
      {icon && (
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            selected
              ? "border-[#1FBF9F]/30 bg-white text-[#1FBF9F]"
              : "border-[#E5E7EB] bg-[#F8FAF9] text-[#6B7280] group-hover:border-[#1FBF9F]/30 group-hover:text-[#1FBF9F]"
          }`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold leading-snug transition-colors ${
            selected ? "text-[#1FBF9F]" : "text-[#1A1A1A]"
          }`}
        >
          {label}
        </p>
        {description && (
          <p className="mt-1 text-xs leading-5 text-[#6B7280]">{description}</p>
        )}
      </div>
      {/* Selection indicator */}
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          selected ? "border-[#1FBF9F] bg-[#1FBF9F]" : "border-[#D1D5DB] bg-white"
        }`}
      >
        {selected && (
          <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 8 8">
            <path d="M6.5 1.5L3 5 1.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </span>
    </button>
  );
}

// ── Number input ──────────────────────────────────────────────────────────────

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder = "0",
  min,
  max,
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#374151]">{label}</label>
      <div className="flex items-center overflow-hidden rounded-[1rem] border border-[#E5E7EB] bg-white transition-all focus-within:border-[#1FBF9F] focus-within:ring-2 focus-within:ring-[#1FBF9F]/20">
        {prefix && (
          <span className="select-none border-r border-[#E5E7EB] bg-[#F8FAF9] px-3 py-3 text-sm font-medium text-[#6B7280]">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          max={max}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]"
        />
        {suffix && (
          <span className="select-none border-l border-[#E5E7EB] bg-[#F8FAF9] px-3 py-3 text-sm font-medium text-[#6B7280]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
