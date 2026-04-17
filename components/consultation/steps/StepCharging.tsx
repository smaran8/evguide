import { Home, MapPin, Zap } from "lucide-react";
import { OptionCard } from "@/components/consultation/ConsultationStep";
import type { ConsultationFormState, ChargingSpeedImportance } from "@/types/consultation";

const SPEED_OPTIONS: {
  value: ChargingSpeedImportance;
  label: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Not important",
    description: "I charge overnight at home — speed doesn't matter.",
  },
  {
    value: "medium",
    label: "Useful but not critical",
    description: "Occasional rapid charges for longer trips.",
  },
  {
    value: "high",
    label: "Essential",
    description: "I need fast charging regularly as part of my routine.",
  },
];

interface Props {
  state: ConsultationFormState;
  onChange: (partial: Partial<ConsultationFormState>) => void;
}

export default function StepCharging({ state, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Home charging */}
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-[#1FBF9F]" />
            <p className="text-sm font-semibold text-[#1A1A1A]">Do you have home charging?</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#6B7280]">
            A home charger or driveway socket makes EV ownership significantly simpler.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard
            selected={state.home_charging === true}
            onClick={() => onChange({ home_charging: true })}
            label="Yes — I can charge at home"
          />
          <OptionCard
            selected={state.home_charging === false}
            onClick={() => onChange({ home_charging: false })}
            label="No — public or work charging only"
          />
        </div>
      </div>

      {/* Public charging */}
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#1FBF9F]" />
            <p className="text-sm font-semibold text-[#1A1A1A]">
              Are you comfortable using public chargers?
            </p>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#6B7280]">
            Good to know if you&apos;ll be relying on rapid chargers away from home.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard
            selected={state.public_charging_ok === true}
            onClick={() => onChange({ public_charging_ok: true })}
            label="Yes, comfortable"
          />
          <OptionCard
            selected={state.public_charging_ok === false}
            onClick={() => onChange({ public_charging_ok: false })}
            label="Prefer to avoid it"
          />
        </div>
      </div>

      {/* Charging speed importance */}
      <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#1FBF9F]" />
            <p className="text-sm font-semibold text-[#1A1A1A]">
              How important is fast charging speed?
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          {SPEED_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              selected={state.charging_speed_importance === opt.value}
              onClick={() => onChange({ charging_speed_importance: opt.value })}
              label={opt.label}
              description={opt.description}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
