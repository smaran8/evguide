export type EVNewsItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  readTime?: string;
  publishedAt?: string;
  image: string;
  url: string;
};

export interface EVModel {
  id: string;
  brand: string;
  model: string;
  heroImage: string;
  price: number;
  motorCapacityKw: number;
  torqueNm: number;
  groundClearanceMm: number;
  tyreSize: string;
  batteryKWh: number;
  rangeKm: number;
  drive: string;
  chargingStandard: string;
  fastChargeTime: string;
  adas: string;
  warranty: string;
  seats: number;
  bootLitres: number;
  topSpeedKph: number;
  acceleration: string;
  description: string;
  bestFor: string;
  lovedReason: string;
}

export interface BankFacility {
  label: string;
  value: string;
}

export interface BankOffer {
  id: string;
  bank: string;
  interestRate: number;
  maxTenureYears: number;
  maxLtvPercent: number;
  processingFee: string;
  tag: string;
  facilities?: string[];
  terms?: BankFacility[];
}

export interface OfferFormState {
  fullName: string;
  email: string;
  preferredTime: string;
  consent: boolean;
  notes: string;
}