"use client";

import { CheckCircle2, Minus } from "lucide-react";
import type { EVModel } from "@/types";
import { applyEvEnrichment } from "@/data/evEnrichment";
import { calcTCO } from "@/lib/ev-intelligence";

interface Props {
  modelA: EVModel;
  modelB: EVModel;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseAccel(s: string): number | null {
  const m = String(s).match(/([0-9.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function emi(price: number) {
  const principal = price * 0.9;
  const r = 0.099 / 12;
  const n = 48;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

function fiveYearTCO(v: EVModel): number {
  const tco = calcTCO({
    vehiclePrice: v.price,
    batteryKWh: v.batteryKWh ?? 60,
    rangeKm: v.rangeKm ?? 400,
    annualMiles: 7500,
    energyRatePence: 28,
    publicChargeMixPct: 20,
  });
  const annualRunning = (tco.total3YrCostGbp - v.price) / 3;
  return Math.round(v.price + annualRunning * 5);
}

type DiffResult = { text: string; side: "A" | "B" | "tie" };

function computeDiff(
  numA: number | null,
  numB: number | null,
  lowerBetter: boolean,
  fmt: (diff: number, winner: "A" | "B") => string,
): DiffResult {
  if (numA === null || numB === null || numA === numB) return { text: "", side: "tie" };
  const aWins = lowerBetter ? numA < numB : numA > numB;
  const diff = Math.abs(numA - numB);
  return { text: fmt(diff, aWins ? "A" : "B"), side: aWins ? "A" : "B" };
}

// ── row component ─────────────────────────────────────────────────────────────

type RowData = {
  label: string;
  displayA: string;
  displayB: string;
  numA: number | null;
  numB: number | null;
  lowerBetter: boolean;
  diff: DiffResult;
};

function SpecRow({ row }: { row: RowData }) {
  const { displayA, displayB, numA, numB, lowerBetter, diff } = row;

  const aWins =
    numA !== null && numB !== null
      ? lowerBetter
        ? numA < numB
        : numA > numB
      : false;
  const bWins =
    numA !== null && numB !== null
      ? lowerBetter
        ? numB < numA
        : numB > numA
      : false;
  const tie = !aWins && !bWins;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-0 border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFFFE] transition-colors">
      {/* Label */}
      <div className="px-5 py-4">
        <span className="text-sm font-medium text-[#374151]">{row.label}</span>
      </div>

      {/* Car A */}
      <div
        className={`px-5 py-4 border-l border-[#F0F0F0] ${
          aWins ? "bg-[#F0FDF9]" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {aWins && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1FBF9F]" />}
          {tie && <Minus className="h-4 w-4 shrink-0 text-[#D1D5DB]" />}
          <span
            className={`text-sm font-semibold ${
              aWins
                ? "text-[#0F9B77]"
                : tie
                ? "text-[#6B7280]"
                : "text-[#9CA3AF]"
            }`}
          >
            {displayA}
          </span>
        </div>
        {diff.side === "A" && diff.text && (
          <span className="mt-1 inline-block rounded-full bg-[#E8F8F5] px-2 py-0.5 text-[10px] font-bold text-[#0F9B77]">
            {diff.text}
          </span>
        )}
      </div>

      {/* Car B */}
      <div
        className={`px-5 py-4 border-l border-[#F0F0F0] ${
          bWins ? "bg-[#F0FDF9]" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {bWins && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1FBF9F]" />}
          {tie && <Minus className="h-4 w-4 shrink-0 text-[#D1D5DB]" />}
          <span
            className={`text-sm font-semibold ${
              bWins
                ? "text-[#0F9B77]"
                : tie
                ? "text-[#6B7280]"
                : "text-[#9CA3AF]"
            }`}
          >
            {displayB}
          </span>
        </div>
        {diff.side === "B" && diff.text && (
          <span className="mt-1 inline-block rounded-full bg-[#E8F8F5] px-2 py-0.5 text-[10px] font-bold text-[#0F9B77]">
            {diff.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ── group component ────────────────────────────────────────────────────────────

function SpecGroup({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: string;
  rows: RowData[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      {/* Group header */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-[#E5E7EB] bg-[#F8FAF9]">
        <div className="flex items-center gap-2 px-5 py-3">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#374151]">
            {title}
          </span>
        </div>
        <div className="border-l border-[#E5E7EB] px-5 py-3" />
        <div className="border-l border-[#E5E7EB] px-5 py-3" />
      </div>

      {/* Rows */}
      {rows.map((row) => (
        <SpecRow key={row.label} row={row} />
      ))}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export default function PremiumCompareTable({ modelA, modelB }: Props) {
  const eA = applyEvEnrichment(modelA);
  const eB = applyEvEnrichment(modelB);

  const emiA = emi(modelA.price);
  const emiB = emi(modelB.price);
  const tcoA = fiveYearTCO(modelA);
  const tcoB = fiveYearTCO(modelB);
  const accelA = parseAccel(modelA.acceleration);
  const accelB = parseAccel(modelB.acceleration);

  // helper builder
  function row(
    label: string,
    numA: number | null,
    numB: number | null,
    lowerBetter: boolean,
    display: (n: number) => string,
    diffFmt: (diff: number, winner: "A" | "B") => string,
  ): RowData {
    return {
      label,
      displayA: numA !== null ? display(numA) : "N/A",
      displayB: numB !== null ? display(numB) : "N/A",
      numA,
      numB,
      lowerBetter,
      diff: computeDiff(numA, numB, lowerBetter, diffFmt),
    };
  }

  const priceGroups: RowData[] = [
    row(
      "Purchase Price",
      modelA.price, modelB.price, true,
      (n) => `£${n.toLocaleString()}`,
      (d) => `£${d.toLocaleString()} cheaper`,
    ),
    row(
      "Est. Monthly Finance",
      emiA, emiB, true,
      (n) => `£${n}/mo`,
      (d) => `£${d}/mo less`,
    ),
    row(
      "5-Year Running Cost",
      tcoA, tcoB, true,
      (n) => `£${n.toLocaleString()}`,
      (d) => `£${d.toLocaleString()} less`,
    ),
  ];

  const rangeGroups: RowData[] = [
    row(
      "WLTP Range",
      modelA.rangeKm, modelB.rangeKm, false,
      (n) => `${n} km`,
      (d) => `+${d} km`,
    ),
    row(
      "Real-World Range",
      eA.realWorldRangeMiles ?? Math.round(modelA.rangeKm * 0.621 * 0.82),
      eB.realWorldRangeMiles ?? Math.round(modelB.rangeKm * 0.621 * 0.82),
      false,
      (n) => `~${Math.round(n)} mi`,
      (d) => `+${Math.round(d)} mi`,
    ),
    row(
      "Battery Size",
      modelA.batteryKWh, modelB.batteryKWh, false,
      (n) => `${n} kWh`,
      (d) => `+${d} kWh`,
    ),
    row(
      "Annual Energy Cost",
      eA.annualEnergyCostGbp ?? null,
      eB.annualEnergyCostGbp ?? null,
      true,
      (n) => `£${Math.round(n)}/yr`,
      (d) => `£${Math.round(d)} less/yr`,
    ),
  ];

  const chargingGroups: RowData[] = [
    row(
      "DC Rapid Charging",
      eA.chargingSpeedDcKw ?? null,
      eB.chargingSpeedDcKw ?? null,
      false,
      (n) => `${n} kW`,
      (d) => `+${d} kW`,
    ),
    row(
      "AC Home Charging",
      eA.chargingSpeedAcKw ?? null,
      eB.chargingSpeedAcKw ?? null,
      false,
      (n) => `${n} kW`,
      (d) => `+${d} kW`,
    ),
    ...(eA.chargeTimeTo80Mins || eB.chargeTimeTo80Mins
      ? [
          row(
            "10→80% Charge Time",
            eA.chargeTimeTo80Mins ?? null,
            eB.chargeTimeTo80Mins ?? null,
            true,
            (n) => `${n} min`,
            (d) => `${d} min faster`,
          ),
        ]
      : []),
  ];

  const perfGroups: RowData[] = [
    row(
      "0–100 km/h",
      accelA, accelB, true,
      (n) => `${n.toFixed(1)}s`,
      (d) => `${d.toFixed(1)}s faster`,
    ),
    row(
      "Top Speed",
      modelA.topSpeedKph, modelB.topSpeedKph, false,
      (n) => `${n} km/h`,
      (d) => `+${d} km/h`,
    ),
    row(
      "Motor Power",
      modelA.motorCapacityKw, modelB.motorCapacityKw, false,
      (n) => `${n} kW`,
      (d) => `+${d} kW`,
    ),
    row(
      "Torque",
      modelA.torqueNm, modelB.torqueNm, false,
      (n) => `${n} Nm`,
      (d) => `+${d} Nm`,
    ),
  ];

  const practicalGroups: RowData[] = [
    row(
      "Seats",
      modelA.seats, modelB.seats, false,
      (n) => `${n}`,
      (d) => `+${d} seats`,
    ),
    row(
      "Boot Space",
      modelA.bootLitres, modelB.bootLitres, false,
      (n) => `${n} L`,
      (d) => `+${d} L`,
    ),
    row(
      "Ground Clearance",
      modelA.groundClearanceMm, modelB.groundClearanceMm, false,
      (n) => `${n} mm`,
      (d) => `+${d} mm`,
    ),
  ];

  // string rows (no winner logic)
  function stringRow(label: string, a: string, b: string): RowData {
    return {
      label,
      displayA: a || "N/A",
      displayB: b || "N/A",
      numA: null,
      numB: null,
      lowerBetter: false,
      diff: { text: "", side: "tie" },
    };
  }

  const ownershipGroups: RowData[] = [
    stringRow("Warranty", modelA.warranty, modelB.warranty),
    stringRow("Body Type", modelA.bodyType ?? "—", modelB.bodyType ?? "—"),
    stringRow("Charging Port", modelA.chargePortType ?? modelA.chargingStandard, modelB.chargePortType ?? modelB.chargingStandard),
  ];

  const nameA = `${modelA.brand} ${modelA.model}`;
  const nameB = `${modelB.brand} ${modelB.model}`;

  return (
    <section className="bg-[#F8FAF9] py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Section header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1FBF9F]">Spec Comparison</p>
          <h2 className="mt-1 text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
            Detailed side-by-side
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Green rows show the winner — diff labels show exactly how much better.
          </p>
        </div>

        {/* Sticky column headers */}
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#6B7280]">
            Spec
          </div>
          <div className="border-l border-[#E5E7EB] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#374151]">{modelA.brand}</p>
            <p className="text-sm font-extrabold text-[#1A1A1A]">{modelA.model}</p>
          </div>
          <div className="border-l border-[#E5E7EB] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#374151]">{modelB.brand}</p>
            <p className="text-sm font-extrabold text-[#1A1A1A]">{modelB.model}</p>
          </div>
        </div>

        <div className="space-y-3">
          <SpecGroup title="Price & Cost" icon="💰" rows={priceGroups} />
          <SpecGroup title="Range & Battery" icon="🔋" rows={rangeGroups} />
          <SpecGroup title="Charging" icon="⚡" rows={chargingGroups} />
          <SpecGroup title="Performance" icon="🏎" rows={perfGroups} />
          <SpecGroup title="Practicality" icon="🚗" rows={practicalGroups} />
          <SpecGroup title="Ownership" icon="📋" rows={ownershipGroups} />
        </div>

        <p className="mt-4 text-xs text-[#9CA3AF]">
          Finance est. at 9.9% APR, 48 months, 10% deposit · Real-world range = 82% of WLTP ·
          5-yr TCO at 7,500 mi/yr, 28p/kWh home rate.
          {nameA} vs {nameB}.
        </p>
      </div>
    </section>
  );
}
