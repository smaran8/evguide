"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompareHero from "@/components/CompareHero";
import ComparisonTable from "@/components/ComparisonTable";
import ComparisonConsultationForm from "@/components/ComparisonConsultationForm";
import AllModelsComparison from "@/components/AllModelsComparison";
import { evModels } from "@/data/evModels";
import { mapDbEV, type DbEV } from "@/lib/ev-models";
import type { EVModel } from "@/types";

export default function ComparePage() {
  return (
    <Suspense>
      <ComparePageInner />
    </Suspense>
  );
}

function ComparePageInner() {
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
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const modelA = models.find(m => m.id === selectedA) ?? null;
  const modelB = models.find(m => m.id === selectedB) ?? null;

  const isCompareDisabled = !selectedA || !selectedB || selectedA === selectedB;

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

        if (mapped.length > 0) {
          setModels(mapped);
        }
      } catch {
        // Keep static fallback data if API fetch fails.
      }
    }

    loadModels();

    return () => {
      mounted = false;
    };
  }, []);

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
        models={models}
        selectedA={selectedA}
        selectedB={selectedB}
        onSelectA={setSelectedA}
        onSelectB={setSelectedB}
      />
      
      <section className="border-b border-slate-200 bg-gradient-to-r from-slate-100 to-blue-50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <button
            onClick={handleCompare}
            disabled={isCompareDisabled}
            className={`rounded-2xl px-8 py-3 text-sm font-semibold text-white transition-all ${
              isCompareDisabled
                ? "cursor-not-allowed bg-slate-400"
                : "bg-blue-600 shadow-lg shadow-blue-300/40 hover:-translate-y-0.5 hover:bg-blue-700"
            }`}
          >
            Compare Now
          </button>
          {isCompareDisabled && (
            <p className="mt-2 text-sm font-medium text-slate-700">
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
          <section className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-10">
              <h3 className="text-2xl font-bold text-slate-900">Continue Comparing</h3>
              <p className="mt-2 text-slate-600">
                You can compare another pair right away or pick from popular EV options below.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowComparison(false);
                  setSelectedA("");
                  setSelectedB("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Compare Another Pair
              </button>
            </div>
          </section>
        </>
      )}
      
      <AllModelsComparison models={models} />
      <Footer />
    </main>
  );
}