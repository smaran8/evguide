import { PoundSterling, Users, Leaf, Cpu, Zap, Sparkles } from "lucide-react";
import { OptionCard } from "@/components/consultation/ConsultationStep";
import type { ConsultationFormState, EvReason } from "@/types/consultation";

const REASONS: {
  value: EvReason;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "save_money",
    label: "Save money on running costs",
    description: "Lower fuel and maintenance bills over time.",
    icon: <PoundSterling className="h-4 w-4" />,
  },
  {
    value: "family_use",
    label: "Better family transport",
    description: "Space, safety, and practical everyday use.",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "environment",
    label: "Reduce my carbon footprint",
    description: "Driving cleaner is important to me.",
    icon: <Leaf className="h-4 w-4" />,
  },
  {
    value: "technology",
    label: "I love the technology",
    description: "Software, connectivity, and modern features.",
    icon: <Cpu className="h-4 w-4" />,
  },
  {
    value: "performance",
    label: "Performance and driving thrill",
    description: "Instant torque, fast acceleration.",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    value: "brand_status",
    label: "Brand and style statement",
    description: "The car I drive reflects who I am.",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

interface Props {
  state: ConsultationFormState;
  onChange: (partial: Partial<ConsultationFormState>) => void;
}

export default function StepReason({ state, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {REASONS.map((r) => (
        <OptionCard
          key={r.value}
          selected={state.main_reason_for_ev === r.value}
          onClick={() => onChange({ main_reason_for_ev: r.value })}
          icon={r.icon}
          label={r.label}
          description={r.description}
        />
      ))}
    </div>
  );
}
