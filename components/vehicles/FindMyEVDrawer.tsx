"use client";

import { useEffect, useRef } from "react";
import RecommendationForm from "@/components/recommendation/RecommendationForm";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function FindMyEVDrawer({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── Drawer panel ────────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Find My EV"
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-slate-50 shadow-2xl transition-transform duration-300 ease-in-out sm:w-[600px] lg:w-[680px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Find My EV</p>
              <p className="text-xs text-slate-500">AI-powered matching — takes 2 minutes</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Trust strip */}
        <div className="flex shrink-0 items-center justify-center gap-6 border-b border-slate-100 bg-white px-6 py-2.5">
          {[
            { icon: "⚡", label: "Instant results" },
            { icon: "🔒", label: "No account needed" },
            { icon: "🎯", label: "Personalised to you" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <RecommendationForm />
        </div>
      </div>
    </>
  );
}
