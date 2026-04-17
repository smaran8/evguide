import { NumberField } from "@/components/consultation/ConsultationStep";
import type { ConsultationFormState } from "@/types/consultation";

const BUDGET_PRESETS = [
  { label: "Under £25k", min: 0, max: 25000 },
  { label: "£25k – £40k", min: 25000, max: 40000 },
  { label: "£40k – £60k", min: 40000, max: 60000 },
  { label: "£60k+", min: 60000, max: null },
];

interface Props {
  state: ConsultationFormState;
  onChange: (partial: Partial<ConsultationFormState>) => void;
}

export default function StepBudget({ state, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Quick presets */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#6B7280]">
          Quick select
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BUDGET_PRESETS.map((p) => {
            const isActive =
              state.budget_min_gbp === p.min && state.budget_max_gbp === p.max;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  onChange({
                    budget_min_gbp: p.min,
                    budget_max_gbp: p.max,
                  })
                }
                className={`rounded-[1rem] border px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border-[#1FBF9F] bg-[#E8F8F5] text-[#1FBF9F]"
                    : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#1FBF9F]/40"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual range */}
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F8FAF9] p-5 space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B7280]">
          Or enter manually
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Minimum budget"
            value={state.budget_min_gbp}
            onChange={(v) => onChange({ budget_min_gbp: v })}
            prefix="£"
            placeholder="e.g. 20000"
            min={0}
          />
          <NumberField
            label="Maximum budget"
            value={state.budget_max_gbp}
            onChange={(v) => onChange({ budget_max_gbp: v })}
            prefix="£"
            placeholder="e.g. 40000"
            min={0}
          />
        </div>
      </div>

      {/* Monthly target */}
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5">
        <p className="text-sm font-medium text-[#1A1A1A]">
          Target monthly payment{" "}
          <span className="font-normal text-[#6B7280]">(optional)</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-[#6B7280]">
          If you&apos;re financing, what monthly payment would feel comfortable?
        </p>
        <div className="mt-4">
          <NumberField
            label=""
            value={state.target_monthly_payment_gbp}
            onChange={(v) => onChange({ target_monthly_payment_gbp: v })}
            prefix="£"
            suffix="/mo"
            placeholder="e.g. 400"
            min={0}
          />
        </div>
      </div>
    </div>
  );
}
