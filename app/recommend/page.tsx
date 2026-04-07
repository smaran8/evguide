/**
 * app/recommend/page.tsx
 *
 * The "Find My EV" page — entry point for the AI recommendation engine.
 *
 * This is a Server Component that renders:
 *  - A premium hero/intro section
 *  - The client-side RecommendationForm wizard
 *  - Standard Navbar and Footer
 */

import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RecommendationForm from "@/components/recommendation/RecommendationForm";

export const metadata: Metadata = {
  title: "Find My EV | EV Guide",
  description:
    "Answer a few questions about your budget, lifestyle, and preferences, and our AI scoring engine will recommend the best electric vehicles for you.",
};

export default function RecommendPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* ── Hero section ── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          {/* Tag */}
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
            </svg>
            AI-Powered Matching
          </span>

          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-slate-900">
            Find the perfect EV<br />
            <span className="text-blue-600">for your life</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-slate-600">
            Answer 8 quick questions about your budget, driving habits, and family needs.
            Our scoring engine analyses every EV in our database and returns your top 3 matches —
            with clear reasons explaining why each one suits you.
          </p>

          {/* Trust indicators */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { icon: "⚡", label: "Instant results" },
              { icon: "🔒", label: "No account needed" },
              { icon: "📊", label: "Scored across 4 dimensions" },
              { icon: "🎯", label: "Personalised to you" },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <span>{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form section ── */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <RecommendationForm />
      </section>

      <Footer />
    </main>
  );
}
