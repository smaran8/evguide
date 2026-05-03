import type { AllVehiclesSortOption, PersonalizedVehicleCard } from "@/types";

export type SortConfig = {
  value: AllVehiclesSortOption;
  label: string;
};

export const SORT_OPTIONS: SortConfig[] = [
  { value: "recommended", label: "Highest match score" },
  { value: "price_low", label: "Lowest monthly cost" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "range", label: "Best range" },
  { value: "newest", label: "Newest" },
  { value: "best_value", label: "Best value" },
];

function bestValueScore(v: PersonalizedVehicleCard): number {
  // km per £1000 spent — higher is better
  return (v.rangeKm / (v.price / 1000)) + (v.batteryKWh / (v.price / 10000));
}

export function sortVehicles(
  vehicles: PersonalizedVehicleCard[],
  sort: AllVehiclesSortOption,
): PersonalizedVehicleCard[] {
  const arr = [...vehicles];
  switch (sort) {
    case "recommended":
      return arr.sort((a, b) => b.recommendationScore - a.recommendationScore);
    case "price_low":
      return arr.sort((a, b) => a.price - b.price);
    case "price_high":
      return arr.sort((a, b) => b.price - a.price);
    case "range":
      return arr.sort((a, b) => b.rangeKm - a.rangeKm);
    case "newest":
      // DB returns newest-first by default; preserve original order
      return arr;
    case "best_value":
      return arr.sort((a, b) => bestValueScore(b) - bestValueScore(a));
    default:
      return arr;
  }
}
