"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PremiumCompareHero from "@/components/compare/PremiumCompareHero";
import PremiumCompareSummary from "@/components/compare/PremiumCompareSummary";
import PremiumCompareTable from "@/components/compare/PremiumCompareTable";
import PremiumCompareInsights from "@/components/compare/PremiumCompareInsights";
import PremiumCompareCTA from "@/components/compare/PremiumCompareCTA";
import { evModels } from "@/data/evModels";
import { mapDbEV, type DbEV } from "@/lib/ev-models";
import { trackEvent } from "@/lib/tracking/client";
import type { EVModel } from "@/types";

// Simple overall-winner score used to pre-select the CTA winner
function overallScore(v: EVModel): number {
  let s = 0;
  s += Math.max(0, 40 - Math.round(v.price / 2000));
  s += Math.min(25, Math.round(v.rangeKm / 20));
  if (v.batteryKWh > 0 && v.rangeKm > 0)
    s += Math.min(15, Math.round((v.rangeKm / v.batteryKWh) * 2));
  const a = parseFloat(String(v.acceleration).match(/([0-9.]+)/)?.[1] ?? "10") || 10;
  s += Math.max(0, 20 - Math.round(a * 2));
  return Math.max(10, Math.min(99, s));
}

export default function ComparePageClient() {
  const searchParams = useSearchParams();
  const [models, setModels] = useState<EVModel[]>(evModels);
  const [selectedA, setSelectedA] = useState<string>(() => {
    const carA = searchParams.get("carA");
    return carA && evModels.some((m) => m.id === carA) ? carA : "";
  });
  const [selectedB, setSelectedB] = useState<string>(() => {
    const carB = searchParams.get("carB");
    return carB && evModels.some((m) => m.id === carB) ? carB : "";
  });
  const comparisonRef = useRef<HTMLDivElement>(null);
  const trackedComparisonRef = useRef<string | null>(null);

  const modelA = models.find((m) => m.id === selectedA) ?? null;
  const modelB = models.find((m) => m.id === selectedB) ?? null;
  const showComparison = Boolean(modelA && modelB && selectedA !== selectedB);

  // Load live DB models
  useEffect(() => {
    let mounted = true;
    async function loadModels() {
      try {
        const res = await fetch("/api/evs", { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json();
        if (!mounted || !Array.isArray(payload?.data)) return;
        const mapped = payload.data
          .filter((item: Partial<DbEV>) => item?.id && item?.brand && item?.model)
          .map((item: DbEV) => mapDbEV(item));
        if (mapped.length > 0) setModels(mapped);
      } catch {
        // fallback to static
      }
    }
    void loadModels();
    return () => { mounted = false; };
  }, []);

  // Track compare event (once per unique pair)
  useEffect(() => {
    if (!showComparison) { trackedComparisonRef.current = null; return; }
    const key = `${selectedA}:${selectedB}`;
    if (trackedComparisonRef.current === key) return;
    trackedComparisonRef.current = key;
    void trackEvent({ eventType: "compare_clicked", eventValue: { carA: selectedA, carB: selectedB } });
  }, [selectedA, selectedB, showComparison]);

  const handleSwap = () => { setSelectedA(selectedB); setSelectedB(selectedA); };
  const handleReset = () => {
    setSelectedA(""); setSelectedB("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Derive winner for CTA (safe — only used when showComparison is true)
  const winner: EVModel | null =
    modelA && modelB
      ? overallScore(modelA) >= overallScore(modelB)
        ? modelA
        : modelB
      : null;

  return (
    <>
      {/* ── Vehicle selector hero ── */}
      <PremiumCompareHero
        models={models}
        selectedA={selectedA}
        selectedB={selectedB}
        onSelectA={setSelectedA}
        onSelectB={setSelectedB}
        onSwap={handleSwap}
      />

      {/* ── Comparison result ── */}
      {showComparison && modelA && modelB && winner && (
        <div ref={comparisonRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">

          {/* 0. Hero summary cards */}
          <PremiumCompareSummary modelA={modelA} modelB={modelB} />

          {/* 1. Detailed comparison table — FIRST */}
          <PremiumCompareTable modelA={modelA} modelB={modelB} />

          {/* 2. Winner summary — SECOND */}
          <PremiumCompareInsights modelA={modelA} modelB={modelB} />

          {/* 3. Get Quotation CTA — THIRD */}
          <PremiumCompareCTA
            modelA={modelA}
            modelB={modelB}
            winner={winner}
            onReset={handleReset}
          />
        </div>
      )}

      {/* ── Empty state ── */}
      {!showComparison && (
        <div className="py-20 px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#E8F8F5]">
            <svg className="h-6 w-6 text-[#1FBF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <h3 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Select two vehicles</h3>
          <p className="mx-auto max-w-md text-[#4B5563]">
            Choose two EVs from the dropdowns above to see a side-by-side comparison of range, cost, and specs.
          </p>
        </div>
      )}
    </>
  );
}
