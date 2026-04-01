import { BankOffer } from "@/types";

export const bankOffers: BankOffer[] = [
  {
    id: "hsbc",
    bank: "HSBC",
    interestRate: 7.9,
    maxTenureYears: 7,
    maxLtvPercent: 85,
    processingFee: "1.0%",
    tag: "Best overall",
    facilities: [
      "Early repayment option",
      "Online application support",
      "EV-focused valuation",
    ],
    terms: [
      { label: "Interest rate", value: "7.9% fixed starting rate" },
      { label: "Maximum tenure", value: "7 years" },
      { label: "Maximum finance", value: "Up to 85% of vehicle value" },
      { label: "Processing fee", value: "1.0% of loan amount" },
    ],
  },
  {
    id: "santander",
    bank: "Santander",
    interestRate: 8.1,
    maxTenureYears: 6,
    maxLtvPercent: 80,
    processingFee: "0.8%",
    tag: "Fast approval",
    facilities: [
      "Digital document upload",
      "Quick eligibility screening",
      "Flexible repayment window",
    ],
    terms: [
      { label: "Interest rate", value: "8.1% starting rate" },
      { label: "Maximum tenure", value: "6 years" },
      { label: "Maximum finance", value: "Up to 80% of vehicle value" },
      { label: "Processing fee", value: "0.8% of loan amount" },
    ],
  },
  {
    id: "lloyds",
    bank: "Lloyds",
    interestRate: 8.0,
    maxTenureYears: 7,
    maxLtvPercent: 82,
    processingFee: "1.1%",
    tag: "Strong facilities",
    facilities: [
      "Branch support",
      "Consultation assistance",
      "Insurance bundle support",
    ],
    terms: [
      { label: "Interest rate", value: "8.0% representative" },
      { label: "Maximum tenure", value: "7 years" },
      { label: "Maximum finance", value: "Up to 82% of vehicle value" },
      { label: "Processing fee", value: "1.1% of loan amount" },
    ],
  },
];