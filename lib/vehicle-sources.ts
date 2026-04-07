import { evModels as localEvModels } from "@/data/evModels";
import type { BodyType, EVModel, UserPreferences } from "@/types";

const ALLOWED_BRANDS = ["BYD", "Tesla", "Omoda"] as const;
type AllowedBrand = (typeof ALLOWED_BRANDS)[number];

function inferVehicleTier(price: number): EVModel["tier"] {
  if (price <= 32000) return "affordable";
  if (price <= 46000) return "mid";
  return "premium";
}

type ExternalVehicleRecord = {
  id?: string;
  model?: string;
  name?: string;
  brand?: string;
  body_type?: string;
  bodyType?: string;
  price?: number | string;
  battery_kwh?: number | string;
  batteryKwh?: number | string;
  range_miles?: number | string;
  rangeMiles?: number | string;
  range_km?: number | string;
  rangeKm?: number | string;
  seats?: number | string;
  image_url?: string;
  imageUrl?: string;
  vehicle_page_url?: string;
  vehiclePageUrl?: string;
  short_description?: string;
  shortDescription?: string;
  charging_speed?: string;
  chargingSpeed?: string;
  boot_litres?: number | string;
  bootLitres?: number | string;
};

type TeslaInventoryResult = {
  VIN?: string;
  Model?: string;
  Price?: number;
  SalePrice?: number;
  Range?: number;
  Odometer?: number;
  ExteriorColor?: string;
  InventoryType?: string;
};

const BRAND_API_URLS: Record<AllowedBrand, string | undefined> = {
  BYD: process.env.BYD_VEHICLE_API_URL,
  Tesla: process.env.TESLA_VEHICLE_API_URL,
  Omoda: process.env.OMODA_VEHICLE_API_URL,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toNumber(input: unknown, fallback = 0): number {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const normalized = input.replace(/[^0-9.]/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeBodyType(input: unknown): BodyType {
  if (typeof input !== "string") return "any";
  const lower = input.toLowerCase();
  if (lower.includes("suv") || lower.includes("crossover")) return "suv";
  if (lower.includes("hatch")) return "hatchback";
  if (lower.includes("sedan") || lower.includes("saloon")) return "sedan";
  return "any";
}

function inferBodyTypeFromModel(model: string): BodyType {
  const lower = model.toLowerCase();
  if (lower.includes("y") || lower.includes("suv") || lower.includes("atto") || lower.includes("sealion") || lower.includes("e5")) {
    return "suv";
  }
  if (lower.includes("3") || lower.includes("seal")) return "sedan";
  if (lower.includes("dolphin")) return "hatchback";
  return "any";
}

function mapExternalVehicle(record: ExternalVehicleRecord, brand: AllowedBrand): EVModel | null {
  const model = (record.model ?? record.name ?? "").toString().trim();
  if (!model) return null;

  const price = toNumber(record.price);
  if (price <= 0) return null;

  const rangeKm = Math.round(
    toNumber(record.range_km, 0) ||
      toNumber(record.rangeKm, 0) ||
      toNumber(record.range_miles, 0) * 1.609 ||
      toNumber(record.rangeMiles, 0) * 1.609,
  );

  const bodyType = normalizeBodyType(record.body_type ?? record.bodyType);
  const inferredBody = bodyType === "any" ? inferBodyTypeFromModel(model) : bodyType;

  const idBase = record.id?.toString().trim() || `${brand}-${model}`;
  const id = slugify(idBase);

  return {
    id,
    brand,
    model,
    heroImage: record.image_url ?? record.imageUrl ?? "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
    tier: inferVehicleTier(price),
    price,
    motorCapacityKw: 160,
    torqueNm: 300,
    groundClearanceMm: inferredBody === "sedan" ? 140 : 170,
    tyreSize: "235/50 R18",
    batteryKWh: toNumber(record.battery_kwh ?? record.batteryKwh, 60),
    rangeKm: rangeKm || 380,
    drive: "RWD",
    chargingStandard: "CCS",
    fastChargeTime: record.charging_speed ?? record.chargingSpeed ?? "30 min (10-80%)",
    adas: "AEB, Lane Assist, Adaptive Cruise",
    warranty: "See manufacturer terms",
    seats: Math.max(2, Math.round(toNumber(record.seats, 5))),
    bootLitres: Math.max(250, Math.round(toNumber(record.boot_litres ?? record.bootLitres, inferredBody === "sedan" ? 500 : 420))),
    topSpeedKph: 170,
    acceleration: "7.5s",
    description: record.short_description ?? record.shortDescription ?? `${brand} ${model} matched from live source`,
    bestFor: inferredBody === "suv" ? "Families" : inferredBody === "hatchback" ? "City driving" : "Daily commuting",
    lovedReason: "Matched to your preferences from brand inventory data.",
  };
}

async function fetchBrandInventory(brand: AllowedBrand, prefs: UserPreferences): Promise<EVModel[]> {
  const endpoint = BRAND_API_URLS[brand];
  if (!endpoint) {
    if (brand === "Tesla") {
      return fetchTeslaInventoryFromPublicApi(prefs);
    }
    return [];
  }

  const url = new URL(endpoint);
  url.searchParams.set("budget", String(prefs.totalBudget));
  url.searchParams.set("monthly_budget", String(prefs.preferredMonthlyEmi));
  url.searchParams.set("body_type", prefs.preferredBodyType);
  url.searchParams.set("usage", prefs.usageType);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as
      | ExternalVehicleRecord[]
      | { vehicles?: ExternalVehicleRecord[]; data?: ExternalVehicleRecord[] };

    const records = Array.isArray(payload)
      ? payload
      : payload.vehicles ?? payload.data ?? [];

    return records
      .map((item) => mapExternalVehicle(item, brand))
      .filter((item): item is EVModel => Boolean(item));
  } catch {
    return [];
  }
}

async function fetchTeslaInventoryFromPublicApi(prefs: UserPreferences): Promise<EVModel[]> {
  const query = {
    query: {
      model: "",
      condition: "new",
      options: {},
      arrangeby: "Price",
      order: "asc",
      market: "GB",
      language: "en",
      super_region: "europe",
      lng: 0,
      lat: 0,
      zip: "",
      range: 0,
    },
    offset: 0,
    count: 20,
    outsideOffset: 0,
    outsideSearch: false,
  };

  const url = `https://www.tesla.com/inventory/api/v1/inventory-results?query=${encodeURIComponent(JSON.stringify(query))}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as { results?: TeslaInventoryResult[] };
    const records = payload.results ?? [];

    return records
      .map((item) => {
        const modelName = item.Model?.toLowerCase().includes("model y")
          ? "Model Y"
          : "Model 3";

        const rangeKm = Math.round(toNumber(item.Range, modelName === "Model Y" ? 331 : 305) * 1.609);
        const price = toNumber(item.SalePrice ?? item.Price, modelName === "Model Y" ? 44900 : 39000);

        return mapExternalVehicle(
          {
            id: item.VIN,
            model: modelName,
            price,
            range_km: rangeKm,
            seats: 5,
            body_type: modelName === "Model 3" ? "sedan" : "suv",
            short_description: "Matched from Tesla live inventory data.",
          },
          "Tesla",
        );
      })
      .filter((item): item is EVModel => Boolean(item))
      .filter((item) => item.price <= prefs.totalBudget * 1.3);
  } catch {
    return [];
  }
}

function dedupeByBrandModel(candidates: EVModel[]): EVModel[] {
  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.brand.toLowerCase()}-${item.model.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getLocalBrandCandidates(): EVModel[] {
  return localEvModels.filter((item) =>
    ALLOWED_BRANDS.includes(item.brand as AllowedBrand),
  );
}

function bodyTypeMatches(ev: EVModel, preferredBodyType: BodyType): boolean {
  if (preferredBodyType === "any") return true;
  const inferred = inferBodyTypeFromModel(`${ev.brand} ${ev.model}`);
  return inferred === preferredBodyType;
}

function byDemandFit(a: EVModel, b: EVModel, prefs: UserPreferences): number {
  const aPriceDelta = Math.abs(a.price - prefs.totalBudget);
  const bPriceDelta = Math.abs(b.price - prefs.totalBudget);

  const aRangeTarget = prefs.usageType === "highway" ? 450 : prefs.usageType === "mixed" ? 380 : 300;
  const bRangeTarget = aRangeTarget;

  const aRangeDelta = Math.abs(a.rangeKm - aRangeTarget);
  const bRangeDelta = Math.abs(b.rangeKm - bRangeTarget);

  return aPriceDelta + aRangeDelta - (bPriceDelta + bRangeDelta);
}

export async function getBrandDemandCandidates(prefs: UserPreferences): Promise<{ candidates: EVModel[]; usedLiveApi: boolean }> {
  const [byd, tesla, omoda] = await Promise.all([
    fetchBrandInventory("BYD", prefs),
    fetchBrandInventory("Tesla", prefs),
    fetchBrandInventory("Omoda", prefs),
  ]);

  const liveCandidates = [...byd, ...tesla, ...omoda];
  const fallbackCandidates = getLocalBrandCandidates();

  const merged = dedupeByBrandModel([
    ...liveCandidates,
    ...fallbackCandidates,
  ]);

  const stretchBudget = prefs.totalBudget * 1.2;
  const demandFiltered = merged.filter((item) => {
    const budgetOk = item.price <= stretchBudget;
    const bodyOk = bodyTypeMatches(item, prefs.preferredBodyType);
    return budgetOk && bodyOk;
  });

  const sorted = (demandFiltered.length >= 3 ? demandFiltered : merged).sort((a, b) =>
    byDemandFit(a, b, prefs),
  );

  return {
    candidates: sorted,
    usedLiveApi: liveCandidates.length > 0,
  };
}
