import type { AllVehiclesFilters, PersonalizedVehicleCard } from "@/types";

function matchesSearch(vehicle: PersonalizedVehicleCard, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    vehicle.brand.toLowerCase().includes(q) ||
    vehicle.model.toLowerCase().includes(q) ||
    (vehicle.description?.toLowerCase().includes(q) ?? false) ||
    (vehicle.bestFor?.toLowerCase().includes(q) ?? false) ||
    vehicle.tier.toLowerCase().includes(q) ||
    (vehicle.bodyType?.toLowerCase().includes(q) ?? false)
  );
}

export function filterVehicles(
  vehicles: PersonalizedVehicleCard[],
  filters: AllVehiclesFilters,
): PersonalizedVehicleCard[] {
  return vehicles.filter((v) => {
    if (!matchesSearch(v, filters.search)) return false;
    if (filters.budgetMin !== null && v.price < filters.budgetMin) return false;
    if (filters.budgetMax !== null && v.price > filters.budgetMax) return false;
    if (filters.rangeMin !== null && v.rangeKm < filters.rangeMin) return false;
    if (filters.brand !== null && v.brand !== filters.brand) return false;
    if (filters.bodyType !== null && v.bodyType !== filters.bodyType) return false;
    if (filters.seats !== null && v.seats < filters.seats) return false;
    if (filters.batteryMin !== null && v.batteryKWh < filters.batteryMin) return false;
    if (filters.emiMax !== null && v.estimatedEmi > filters.emiMax) return false;
    return true;
  });
}

export function getUniqueBrands(vehicles: PersonalizedVehicleCard[]): string[] {
  return [...new Set(vehicles.map((v) => v.brand))].sort();
}

export function getUniqueBodyTypes(vehicles: PersonalizedVehicleCard[]): string[] {
  return [...new Set(vehicles.map((v) => v.bodyType).filter(Boolean) as string[])].sort();
}

export function defaultFilters(): AllVehiclesFilters {
  return {
    search: "",
    budgetMin: null,
    budgetMax: null,
    rangeMin: null,
    brand: null,
    bodyType: null,
    seats: null,
    batteryMin: null,
    emiMax: null,
    sort: "recommended",
  };
}

export function hasActiveFilters(filters: AllVehiclesFilters): boolean {
  return (
    filters.search !== "" ||
    filters.budgetMin !== null ||
    filters.budgetMax !== null ||
    filters.rangeMin !== null ||
    filters.brand !== null ||
    filters.bodyType !== null ||
    filters.seats !== null ||
    filters.batteryMin !== null ||
    filters.emiMax !== null
  );
}
