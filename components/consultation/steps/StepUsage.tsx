import { NumberField } from "@/components/consultation/ConsultationStep";
import type { ConsultationFormState } from "@/types/consultation";

const FAMILY_SIZES = [1, 2, 3, 4, 5, 6];

interface Props {
  state: ConsultationFormState;
  onChange: (partial: Partial<ConsultationFormState>) => void;
}

export default function StepUsage({ state, onChange }: Props) {
  function handleDailyMiles(v: number | null) {
    onChange({
      daily_miles: v,
      weekly_miles: v != null ? Math.round(v * 7) : null,
      yearly_miles: v != null ? Math.round(v * 365) : null,
    });
  }

  return (
    <div className="space-y-6">
      {/* Mileage */}
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">Daily mileage</p>
          <p className="mt-1 text-xs leading-5 text-[#6B7280]">
            Enter your typical daily driving distance — weekly and yearly will auto-fill.
          </p>
        </div>

        <NumberField
          label="Daily miles"
          value={state.daily_miles}
          onChange={handleDailyMiles}
          suffix="mi/day"
          placeholder="e.g. 30"
          min={0}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Weekly miles"
            value={state.weekly_miles}
            onChange={(v) => onChange({ weekly_miles: v })}
            suffix="mi/wk"
            placeholder="auto"
            min={0}
          />
          <NumberField
            label="Yearly miles"
            value={state.yearly_miles}
            onChange={(v) => onChange({ yearly_miles: v })}
            suffix="mi/yr"
            placeholder="auto"
            min={0}
          />
        </div>
      </div>

      {/* Family size */}
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">Family / household size</p>
          <p className="mt-1 text-xs leading-5 text-[#6B7280]">
            Helps us match seat count and boot space requirements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FAMILY_SIZES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ family_size: n })}
              className={`flex h-11 w-11 items-center justify-center rounded-[1rem] border text-sm font-semibold transition-all ${
                state.family_size === n
                  ? "border-[#1FBF9F] bg-[#E8F8F5] text-[#1FBF9F]"
                  : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#1FBF9F]/40"
              }`}
            >
              {n === 6 ? "6+" : n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
