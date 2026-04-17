import type { LeadScoreCategory } from "@/types/platform";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/lead-pipeline";

interface Props {
  score: number;
  category: LeadScoreCategory;
  showScore?: boolean;
  size?: "sm" | "md";
}

export default function LeadScoreBadge({
  score,
  category,
  showScore = true,
  size = "md",
}: Props) {
  const colorClass = CATEGORY_COLORS[category];
  const label      = CATEGORY_LABELS[category];
  const textSize   = size === "sm" ? "text-[10px]" : "text-xs";
  const padding    = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${colorClass} ${textSize} ${padding}`}
    >
      {showScore && (
        <span className="tabular-nums font-bold">{score}</span>
      )}
      {label}
    </span>
  );
}
