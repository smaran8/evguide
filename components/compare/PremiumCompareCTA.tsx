"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CompareQuotationModal from "@/components/compare/CompareQuotationModal";
import LeadCaptureModal from "@/components/leads/LeadCaptureModal";
import type { EVModel } from "@/types";

interface Props {
  modelA: EVModel;
  modelB: EVModel;
  winner: EVModel;
  onReset: () => void;
  autoOpenQuote?: boolean;
}

export default function PremiumCompareCTA({ modelA, modelB, winner, onReset, autoOpenQuote }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);

  // Auto-open the modal after returning from login
  useEffect(() => {
    if (!autoOpenQuote) return;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setQuoteOpen(true);
    });
  }, [autoOpenQuote, supabase]);

  const winnerLabel = `${winner.brand} ${winner.model}`;

  async function handleGetQuotation() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const next = encodeURIComponent(`/compare?carA=${modelA.id}&carB=${modelB.id}&openQuote=true`);
      router.push(`/login?next=${next}`);
      return;
    }
    setQuoteOpen(true);
  }

  return (
    <section className="bg-[#F8FAF9] py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#1FBF9F]/25 bg-gradient-to-br from-[#E8F8F5] via-white to-white p-8 shadow-sm sm:p-12">

          {/* Decorative glow */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-[#1FBF9F]/10 blur-[80px]" />

          <div className="relative z-10 flex flex-col items-start gap-8 md:flex-row md:items-center">

            {/* Left — copy */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#1FBF9F]" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1FBF9F]">
                  Next Step
                </p>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-[#1A1A1A] sm:text-3xl">
                Want the best deal for the{" "}
                <span className="text-[#1FBF9F]">{winnerLabel}</span>?
              </h2>
              <p className="mt-3 max-w-lg text-[#4B5563]">
                Get a no-obligation quote with full pricing — vehicle cost, finance at the best available
                bank rate, and insurance estimate — or speak directly with an EV expert.
              </p>

              {/* Finance link */}
              <Link
                href={`/finance?car=${winner.id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1FBF9F] hover:underline"
              >
                Check monthly payments for the {winner.model}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right — CTAs */}
            <div className="flex w-full flex-col gap-3 sm:w-auto">
              <button
                type="button"
                onClick={handleGetQuotation}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1FBF9F] px-8 py-4 text-sm font-bold text-white shadow-md transition hover:bg-[#17A589] sm:w-auto"
              >
                Get Quotation
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setExpertOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-8 py-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F8FAF9] sm:w-auto"
              >
                <MessageCircle className="h-4 w-4 text-[#6B7280]" />
                Talk to an Expert
              </button>
            </div>
          </div>

          {/* Compare another pair */}
          <div className="relative z-10 mt-10 border-t border-[#E5E7EB] pt-6 text-center">
            <p className="text-sm text-[#9CA3AF]">Still weighing your options?</p>
            <button
              type="button"
              onClick={onReset}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Compare a different pair
            </button>
          </div>
        </div>
      </div>

      {/* Quotation modal — auth-gated, includes full pricing breakdown */}
      <CompareQuotationModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        vehicle={winner}
        modelA={modelA}
        modelB={modelB}
      />

      {/* Talk to Expert modal */}
      <LeadCaptureModal
        open={expertOpen}
        onClose={() => setExpertOpen(false)}
        interestType="compare"
        title="Talk to an EV expert"
        description="Tell us what you need and we'll recommend the right EV for your situation."
        submitLabel="Send Message"
        vehicleLabel={`${modelA.brand} ${modelA.model} vs ${modelB.brand} ${modelB.model}`}
        defaultMessage={`I compared the ${modelA.brand} ${modelA.model} and ${modelB.brand} ${modelB.model} and would like some guidance from an expert.`}
      />
    </section>
  );
}
