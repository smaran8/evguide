import type { EVModel } from "@/types";
import { evModels } from "@/data/evModels";

export type BudgetBand = "under_30" | "under_40" | "under_55" | "open";
export type MileageBand = "city" | "balanced" | "long_range";
export type ChargingSetup = "home" | "public" | "work" | "unsure";
export type BodyPreference = "suv" | "hatchback" | "sedan" | "any";
export type PurchasePriority = "value" | "range" | "tech" | "family" | "performance";
export type ConditionPreference = "new" | "used" | "either";

export interface MatchAnswers {
  budget: BudgetBand;
  mileage: MileageBand;
  charging: ChargingSetup;
  bodyType: BodyPreference;
  priority: PurchasePriority;
  condition: ConditionPreference;
  postcode: string;
}

export interface MatchQuestionOption<T extends string> {
  value: T;
  title: string;
  description: string;
  eyebrow?: string;
}

export interface MatchQuestion<T extends string> {
  key: keyof MatchAnswers;
  title: string;
  description: string;
  options?: MatchQuestionOption<T>[];
  type?: "choice" | "text";
  placeholder?: string;
}

export interface MatchResult {
  model: EVModel;
  matchScore: number;
  monthlyCost: number;
  usedPrice: number;
  whyItFits: string[];
}

export const defaultAnswers: MatchAnswers = {
  budget: "under_40",
  mileage: "balanced",
  charging: "home",
  bodyType: "any",
  priority: "value",
  condition: "either",
  postcode: "",
};

export const matchQuestions: MatchQuestion<string>[] = [
  {
    key: "budget",
    title: "What budget feels realistic for your next EV?",
    description: "We use this as the first affordability guardrail before anything else.",
    options: [
      { value: "under_30", title: "Under GBP30k", description: "Strong value focus and lower finance pressure." },
      { value: "under_40", title: "Under GBP40k", description: "Balanced sweet spot for mainstream EV buyers." },
      { value: "under_55", title: "Under GBP55k", description: "Room for longer range and more premium features." },
      { value: "open", title: "Open budget", description: "Show the best overall match, including premium options." },
    ],
  },
  {
    key: "mileage",
    title: "How do you normally drive?",
    description: "This shapes how much range and charging speed matter in the scoring.",
    options: [
      { value: "city", title: "Mostly city", description: "Shorter trips, frequent stops, easy daily charging." },
      { value: "balanced", title: "Mixed driving", description: "Commutes in the week and road trips sometimes." },
      { value: "long_range", title: "Long distance", description: "Range confidence and charging speed are a priority." },
    ],
  },
  {
    key: "charging",
    title: "What charging setup do you expect to rely on?",
    description: "Home charging and public charging create very different ownership experiences.",
    options: [
      { value: "home", title: "Home charging", description: "Best for low running costs and convenience." },
      { value: "public", title: "Public network", description: "Charging speed and connector coverage matter more." },
      { value: "work", title: "Workplace charging", description: "Good if your office routine covers most of your needs." },
      { value: "unsure", title: "Still figuring it out", description: "We will bias toward forgiving, lower-friction EVs." },
    ],
  },
  {
    key: "bodyType",
    title: "Which body style feels right?",
    description: "This is a strong preference, but not a hard block if a better match stands out.",
    options: [
      { value: "suv", title: "SUV or crossover", description: "Higher driving position and family-friendly practicality." },
      { value: "hatchback", title: "Hatchback", description: "Compact, efficient, and easy to live with." },
      { value: "sedan", title: "Sedan", description: "Sleeker silhouette with a more premium road feel." },
      { value: "any", title: "I am flexible", description: "Prioritise the smartest recommendation overall." },
    ],
  },
  {
    key: "priority",
    title: "What matters most in the final decision?",
    description: "This is where the recommendation engine starts to feel personal.",
    options: [
      { value: "value", title: "Best value", description: "Get the most EV for the money." },
      { value: "range", title: "Long range", description: "Charge less often and travel further with confidence." },
      { value: "tech", title: "Tech and software", description: "Cabin experience, screens, and intelligent features." },
      { value: "family", title: "Family practicality", description: "Space, usability, and less compromise day to day." },
      { value: "performance", title: "Performance feel", description: "Sharper acceleration and a more premium drive." },
    ],
  },
  {
    key: "condition",
    title: "Are you open to new and used EVs?",
    description: "Used EVs can reduce monthly cost quickly, while new EVs bring the latest tech and warranty comfort.",
    options: [
      { value: "new", title: "New only", description: "Latest product, full warranty, cleaner ownership story." },
      { value: "used", title: "Used is fine", description: "Better affordability if the right model stands out." },
      { value: "either", title: "Show both mindsets", description: "Optimise for the smartest total decision." },
    ],
  },
  {
    key: "postcode",
    title: "What is your postcode?",
    description: "Optional — helps estimate charging costs and local incentives more accurately.",
    type: "text",
    placeholder: "e.g. SW1A 1AA",
  },
];

const bodyMap: Record<string, BodyPreference> = {
  "byd-dolphin": "hatchback",
  "mg-4": "hatchback",
  "mg-5": "hatchback",
  "vw-id3": "hatchback",
  "nissan-leaf": "hatchback",
  "tesla-model-3": "sedan",
  "bmw-i4": "sedan",
  "byd-seal": "sedan",
  "hyundai-ioniq-6": "sedan",
  "vw-id7": "sedan",
  "audi-etron-gt": "sedan",
  "polestar-2": "sedan",
};

function getBodyType(model: EVModel): BodyPreference {
  return bodyMap[model.id] ?? "suv";
}

function getBudgetLimit(budget: BudgetBand) {
  switch (budget) {
    case "under_30":
      return 30000;
    case "under_40":
      return 40000;
    case "under_55":
      return 55000;
    default:
      return 100000;
  }
}

function estimateMonthlyCost(price: number, condition: ConditionPreference) {
  const effectivePrice = condition === "used" ? Math.round(price * 0.82) : price;
  const deposit = effectivePrice * 0.12;
  const principal = Math.max(0, effectivePrice - deposit);
  const monthlyRate = 0.069 / 12;
  const months = 48;
  const financePayment =
    principal > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1)
      : 0;
  const runningCost = 110 + effectivePrice * 0.0016;

  return {
    monthlyCost: Math.round(financePayment + runningCost),
    usedPrice: effectivePrice,
  };
}

function pushReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason) && reasons.length < 4) {
    reasons.push(reason);
  }
}

export function getSafeRecommendationImage(heroImage: string) {
  if (
    heroImage.includes("topgear.com") ||
    heroImage.includes("images.unsplash.com") ||
    heroImage.includes("supabase.co")
  ) {
    return heroImage;
  }

  return "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80";
}

export function getTopMatches(answers: MatchAnswers): MatchResult[] {
  const budgetLimit = getBudgetLimit(answers.budget);

  return evModels
    .map((model) => {
      const reasons: string[] = [];
      let score = 40;
      const { monthlyCost, usedPrice } = estimateMonthlyCost(model.price, answers.condition);
      const bodyType = getBodyType(model);

      if (usedPrice <= budgetLimit) {
        score += 16;
        pushReason(reasons, `${monthlyCost} GBP/month keeps this inside your likely comfort zone.`);
      } else if (usedPrice <= budgetLimit * 1.12) {
        score += 7;
        pushReason(reasons, "Close to your budget if you want to stretch for a stronger EV.");
      } else {
        score -= 18;
      }

      if (answers.mileage === "city") {
        if (model.rangeKm >= 320 && model.rangeKm <= 500) score += 12;
        if (bodyType === "hatchback") score += 8;
        pushReason(reasons, `${model.rangeKm} km range is more than enough for urban and local driving.`);
      }

      if (answers.mileage === "balanced") {
        if (model.rangeKm >= 380) score += 13;
        if (model.bootLitres >= 380) score += 5;
        pushReason(reasons, "Balanced range and practicality suits mixed weekly driving.");
      }

      if (answers.mileage === "long_range") {
        if (model.rangeKm >= 500) score += 17;
        if (model.fastChargeTime.includes("18") || model.fastChargeTime.includes("20") || model.fastChargeTime.includes("24") || model.fastChargeTime.includes("25")) {
          score += 6;
        }
        pushReason(reasons, "Longer range and faster charging reduce motorway friction.");
      }

      if (answers.charging === "home") {
        score += 8;
        pushReason(reasons, "Home charging makes the ownership cost profile especially attractive.");
      }
      if (answers.charging === "public") {
        if (model.chargingStandard.toLowerCase().includes("ccs")) score += 10;
        if (model.fastChargeTime.includes("18") || model.fastChargeTime.includes("20") || model.fastChargeTime.includes("24") || model.fastChargeTime.includes("25") || model.fastChargeTime.includes("26")) {
          score += 7;
        }
        pushReason(reasons, "Public-charging compatibility is strong for this setup.");
      }
      if (answers.charging === "work") {
        score += 7;
        if (model.rangeKm >= 400) score += 5;
        pushReason(reasons, "Enough range to rely on workplace top-ups through the week.");
      }
      if (answers.charging === "unsure") {
        if (model.rangeKm >= 420) score += 10;
        pushReason(reasons, "A forgiving range buffer helps while your charging plan is still evolving.");
      }

      if (answers.bodyType !== "any") {
        if (bodyType === answers.bodyType) {
          score += 11;
          pushReason(reasons, `${answers.bodyType.toUpperCase()} body style aligns with what you want to live with every day.`);
        } else {
          score -= 6;
        }
      }

      switch (answers.priority) {
        case "value":
          if (usedPrice <= 36000) score += 16;
          if (model.badge === "Best Value") score += 6;
          pushReason(reasons, "Strong spec-to-price ratio makes this feel financially sensible.");
          break;
        case "range":
          if (model.rangeKm >= 500) score += 18;
          pushReason(reasons, `${model.rangeKm} km range is one of the strongest fits for your priority.`);
          break;
        case "tech":
          if (model.brand === "Tesla" || model.brand === "Polestar" || model.brand === "BYD") score += 16;
          pushReason(reasons, "Cabin tech and software experience stand out here.");
          break;
        case "family":
          if (model.bootLitres >= 440) score += 10;
          if (model.seats >= 5) score += 8;
          pushReason(reasons, `${model.bootLitres}L boot and ${model.seats} seats support daily family use better.`);
          break;
        case "performance":
          if (parseFloat(model.acceleration) <= 6.0) score += 16;
          if (model.motorCapacityKw >= 220) score += 8;
          pushReason(reasons, "Performance and response feel stronger than the average EV in this range.");
          break;
      }

      if (answers.condition === "used") {
        if (model.price <= 45000) score += 8;
        pushReason(reasons, `Used-market pricing could bring this down to about GBP${usedPrice.toLocaleString()}.`);
      }

      if (answers.condition === "new") {
        score += 6;
        pushReason(reasons, "Works well as a new-car purchase with current tech and warranty confidence.");
      }

      return {
        model,
        monthlyCost,
        usedPrice,
        matchScore: Math.max(52, Math.min(98, Math.round(score))),
        whyItFits: reasons.slice(0, 4),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}

