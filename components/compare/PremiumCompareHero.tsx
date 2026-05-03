import { ArrowLeftRight, Car, Zap } from "lucide-react";
import type { EVModel } from "@/types";

interface PremiumCompareHeroProps {
  models: EVModel[];
  selectedA: string;
  selectedB: string;
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
  onSwap: () => void;
}

export default function PremiumCompareHero({ models, selectedA, selectedB, onSelectA, onSelectB, onSwap }: PremiumCompareHeroProps) {
  return (
    <section className="relative pt-32 pb-16 bg-[#F8FAF9] overflow-hidden border-b border-[#E5E7EB]">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-[100%] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E8F8F5] border border-[#D1F2EB] text-[#1FBF9F] mb-6 pb-1.5 pt-1.5">
          <Zap className="w-3.5 h-3.5" /> Intelligence Compare
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-[#1A1A1A] tracking-tight mb-4">
          Compare & Decide.
        </h1>
        <p className="text-[#4B5563] text-lg md:text-xl max-w-2xl mx-auto mb-16">
          See exactly how models stack up mathematically. We analyze real-world range, charging speeds, and running costs to find your true winner.
        </p>

        {/* The Selector UI */}
        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-3xl mx-auto">
          {/* Car A */}
          <div className="relative flex-1 w-full">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.24em] text-[#6B7280]">
              Vehicle A
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Car className="h-5 w-5 text-[#6B7280]" />
              </div>
              <select
                value={selectedA}
                onChange={(e) => onSelectA(e.target.value)}
                className="appearance-none w-full bg-[#F8FAF9] border border-[#E5E7EB] text-[#1A1A1A] pl-12 pr-10 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D1F2EB] focus:border-[#1FBF9F] transition-all font-semibold text-sm hover:bg-[#E8F8F5] cursor-pointer"
              >
                <option value="">Select a vehicle</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === selectedB}>
                    {m.brand} {m.model}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="h-4 w-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Swap button */}
          <button
            type="button"
            onClick={onSwap}
            disabled={!selectedA || !selectedB}
            className="mt-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition hover:border-[#1FBF9F] hover:text-[#1FBF9F] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Swap vehicles"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>

          {/* Car B */}
          <div className="relative flex-1 w-full">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.24em] text-[#6B7280]">
              Vehicle B
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Car className="h-5 w-5 text-[#6B7280]" />
              </div>
              <select
                value={selectedB}
                onChange={(e) => onSelectB(e.target.value)}
                className="appearance-none w-full bg-[#F8FAF9] border border-[#E5E7EB] text-[#1A1A1A] pl-12 pr-10 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D1F2EB] focus:border-[#1FBF9F] transition-all font-semibold text-sm hover:bg-[#E8F8F5] cursor-pointer"
              >
                <option value="">Select a vehicle</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === selectedA}>
                    {m.brand} {m.model}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="h-4 w-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
