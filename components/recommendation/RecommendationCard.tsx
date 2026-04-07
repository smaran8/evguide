/**
 * components/recommendation/RecommendationCard.tsx
 *
 * Minimal "gated" card shown after the recommendation wizard runs.
 *
 * Intentionally hides full details (price, EMI, spec, hero image) to
 * encourage the user to click "Select This EV" and submit their contact
 * details — which is captured as a lead in the admin panel.
 *
 * What IS shown:
 *   - Rank badge (Best Match / Runner Up / Also Great)
 *   - Brand + model name
 *   - Match score bar (no raw number shown — creates intrigue)
 *   - 1 teaser reason only (not the full list)
 *   - "Select This EV" CTA button
 *
 * On "Select": opens QueryModal → user fills contact form → saved to DB.
 */

"use client";

import { useState } from "react";
import QueryModal from "./QueryModal";
import type { RecommendationResult } from "@/types";

// ── Rank visual config ────────────────────────────────────────────────────────
const RANK_CONFIG = {
  1: {
    label:      "Best Match",
    cardBorder: "border-blue-400 shadow-blue-100",
    badge:      "bg-blue-600 text-white",
    scoreBg:    "bg-blue-600",
    glow:       "shadow-lg shadow-blue-100",
  },
  2: {
    label:      "Runner Up",
    cardBorder: "border-slate-300",
    badge:      "bg-slate-700 text-white",
    scoreBg:    "bg-slate-600",
    glow:       "",
  },
  3: {
    label:      "Also Great",
    cardBorder: "border-slate-200",
    badge:      "bg-slate-500 text-white",
    scoreBg:    "bg-slate-400",
    glow:       "",
  },
} as const;

interface Props {
  result:       RecommendationResult;
  preferenceId: string | null;
}

export default function RecommendationCard({ result, preferenceId }: Props) {
  const { ev, score, rank, reasons } = result;
  const cfg = RANK_CONFIG[rank];

  const [modalOpen, setModalOpen] = useState(false);
  // Track whether this card has already been submitted
  const [submitted, setSubmitted] = useState(false);

  // Show just the first reason as a teaser
  const teaserReason = reasons[0] ?? null;

  return (
    <>
      <article
        className={`flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition-shadow ${cfg.cardBorder} ${cfg.glow}`}
      >
        {/* ── Rank banner ── */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 ${
            rank === 1 ? "bg-blue-600" : rank === 2 ? "bg-slate-700" : "bg-slate-500"
          }`}
        >
          <span className="flex items-center gap-1.5 text-xs font-bold text-white">
            {rank === 1 && (
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
              </svg>
            )}
            {cfg.label}
          </span>
          <span className="text-xs font-semibold text-white/70">#{rank} of 3</span>
        </div>

        {/* ── Card body ── */}
        <div className="flex flex-1 flex-col p-5">

          {/* Brand + Model (identity only — no price/spec) */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {ev.brand}
            </p>
            <h3 className="mt-0.5 text-xl font-bold text-slate-900">{ev.model}</h3>
          </div>

          {/* Match score bar — shows percentage visually but hides the number */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Match Score</span>
              <span className="font-semibold text-slate-700">
                {score >= 75 ? "Excellent" : score >= 55 ? "Good" : "Fair"} fit
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cfg.scoreBg}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* One-line teaser reason */}
          {teaserReason && (
            <p className="mt-4 flex items-start gap-2 text-sm text-slate-600">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {teaserReason}
            </p>
          )}

          {/* "More reasons inside" hint */}
          {reasons.length > 1 && (
            <p className="mt-2 text-xs text-slate-400 italic">
              + {reasons.length - 1} more reason{reasons.length > 2 ? "s" : ""} why this suits you
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* ── CTA ── */}
          {submitted ? (
            /* Post-submission state — show confirmed badge */
            <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-emerald-700">Enquiry Sent</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors
                ${rank === 1
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-slate-800 hover:bg-blue-600"
                }`}
            >
              Select This EV
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </article>

      {/* ── Query Modal (opened on button click) ── */}
      {modalOpen && (
        <QueryModal
          evId={ev.id}
          evBrand={ev.brand}
          evModelName={ev.model}
          score={score}
          rank={rank}
          preferenceId={preferenceId}
          onClose={() => {
            setModalOpen(false);
            // Mark as submitted if the modal closed after a success
            // (QueryModal sets its own success state; we detect re-open)
          }}
          onSuccess={() => {
            setModalOpen(false);
            setSubmitted(true);
          }}
        />
      )}
    </>
  );
}
