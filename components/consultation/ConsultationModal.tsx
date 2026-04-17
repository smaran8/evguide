"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ConsultationWizard from "@/components/consultation/ConsultationWizard";
import type { ConsultationFormState } from "@/types/consultation";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: (consultationId: string | null, state: ConsultationFormState) => void;
}

/**
 * Slide-in drawer that hosts ConsultationWizard.
 * Can be triggered from any page with a boolean `open` prop.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <button onClick={() => setOpen(true)}>Start EV Consultation</button>
 *   <ConsultationModal open={open} onClose={() => setOpen(false)} />
 */
export default function ConsultationModal({ open, onClose, onComplete }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="EV Consultation"
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[600px] lg:w-[680px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1A1A1A]">EV Consultation</span>
            <span className="rounded-full bg-[#E8F8F5] px-2 py-0.5 text-[11px] font-semibold text-[#1FBF9F]">
              Free
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close consultation"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#1FBF9F]/40 hover:text-[#1A1A1A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable wizard content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ConsultationWizard
            onComplete={onComplete}
            onClose={onClose}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
