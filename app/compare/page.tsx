"use client";

import { useState, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import Navbar from "@/components/Navbar";
import CompareHero from "@/components/CompareHero";
import ComparisonTable from "@/components/ComparisonTable";
import ComparisonConsultationForm from "@/components/ComparisonConsultationForm";
import AllModelsComparison from "@/components/AllModelsComparison";
import { evModels } from "@/data/evModels";

export default function ComparePage() {
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const modelA = evModels.find(m => m.id === selectedA) ?? null;
  const modelB = evModels.find(m => m.id === selectedB) ?? null;

  const isCompareDisabled = !selectedA || !selectedB || selectedA === selectedB;

  const handleCompare = (): void => {
    if (!isCompareDisabled) {
      setShowComparison(true);
    }
  };

  useEffect(() => {
    if (showComparison && comparisonRef.current) {
      const scrollTimeout = setTimeout(() => {
        comparisonRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [showComparison]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <CompareHero
        models={evModels}
        selectedA={selectedA}
        selectedB={selectedB}
        onSelectA={setSelectedA}
        onSelectB={setSelectedB}
      />
      
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <button
            onClick={handleCompare}
            disabled={isCompareDisabled}
            className={`rounded-2xl px-8 py-3 text-sm font-semibold text-white transition-colors ${
              isCompareDisabled
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Compare Now
          </button>
          {isCompareDisabled && (
            <p className="mt-2 text-sm text-slate-600">
              Please select 2 different vehicles to compare
            </p>
          )}
        </div>
      </section>

      {showComparison && modelA && modelB && (
        <>
          <div ref={comparisonRef}>
            <ComparisonTable modelA={modelA} modelB={modelB} />
          </div>
          <ComparisonConsultationForm modelA={modelA} modelB={modelB} />
        </>
      )}
      
      <AllModelsComparison />
    </main>
  );
}