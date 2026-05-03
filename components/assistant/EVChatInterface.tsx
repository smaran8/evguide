"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Bot,
  Calendar,
  RotateCcw,
  Sparkles,
  User,
  X,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  matchQuestions,
  getTopMatches,
  defaultAnswers,
  type MatchAnswers,
  type MatchResult,
} from "@/components/recommendation/recommendationEngine";
import { trackEvent } from "@/lib/tracking/client";
import type { EVModel } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "bot";

interface ChatMessage {
  role: MessageRole;
  text: string;
  chips?: string[];            // clickable option chips
  chipValues?: string[];       // matching values for chips (same index)
  results?: MatchResult[];     // recommendation cards
  isFinal?: boolean;           // marks the results message
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "evguide_chat_v2";
const LEAD_SHOWN_KEY = "evguide_lead_shown";

const LANDING_STARTERS = [
  { label: "Best EV under £30k", answer: { budget: "under_30" as const } },
  { label: "Monthly finance options", answer: { priority: "value" as const } },
  { label: "Family SUV recommendation", answer: { bodyType: "suv" as const, priority: "family" as const } },
  { label: "Best long range EV", answer: { priority: "range" as const, mileage: "long_range" as const } },
];

const BRAND_COLORS: Record<string, string> = {
  Tesla:       "from-red-500 to-red-700",
  BYD:         "from-green-500 to-emerald-700",
  Hyundai:     "from-blue-500 to-blue-700",
  Kia:         "from-red-400 to-rose-600",
  BMW:         "from-sky-500 to-blue-700",
  Volkswagen:  "from-slate-500 to-slate-700",
  Volvo:       "from-stone-500 to-stone-700",
  Polestar:    "from-zinc-600 to-zinc-800",
  Audi:        "from-neutral-500 to-neutral-700",
  MG:          "from-orange-500 to-red-600",
  Nissan:      "from-red-500 to-rose-700",
  Omoda:       "from-violet-500 to-purple-700",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthlyEmi(price: number) {
  const loan = price * 0.9;
  const r = 0.085 / 12;
  const n = 48;
  return Math.round((loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

function vehicleTag(v: EVModel): { label: string; color: string } {
  if (v.price <= 30000) return { label: "Best Value",  color: "bg-emerald-100 text-emerald-700" };
  if (v.rangeKm >= 520)  return { label: "Long Range",  color: "bg-blue-100 text-blue-700" };
  if ((v.seats ?? 5) >= 7) return { label: "Family SUV", color: "bg-violet-100 text-violet-700" };
  if (v.price <= 40000) return { label: "Popular",     color: "bg-amber-100 text-amber-700" };
  return                        { label: "Premium",     color: "bg-slate-100 text-slate-700" };
}

/** Build a bot question message from a matchQuestion index */
function buildQuestionMessage(stepIndex: number): ChatMessage {
  const q = matchQuestions[stepIndex]!;
  if (q.type === "text") {
    return {
      role: "bot",
      text: `${q.title}\n${q.description}`,
      chips: ["Skip"],
      chipValues: [""],
    };
  }
  return {
    role: "bot",
    text: `${q.title}\n${q.description}`,
    chips:      q.options!.map((o) => o.title),
    chipValues: q.options!.map((o) => o.value),
  };
}

/** Opening greeting */
const GREETING: ChatMessage = {
  role: "bot",
  text: "Hi! I'm EV Guide AI.\n\nI'll ask you a few quick questions to find your perfect electric vehicle — just pick an option or type your answer.",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CarCard({ result }: { result: MatchResult }) {
  const { model, matchScore, monthlyCost } = result;
  const tag     = vehicleTag(model);
  const gradient = BRAND_COLORS[model.brand] ?? "from-slate-500 to-slate-700";
  const rangeM  = Math.round(model.rangeKm * 0.621);
  const emi     = monthlyEmi(model.price);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
      {/* Gradient image placeholder */}
      <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
        <span className="text-3xl font-black text-white/90 tracking-tight select-none">
          {model.brand[0]}{model.model[0]}
        </span>
        <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.color}`}>
          {tag.label}
        </span>
        <span className="absolute top-2 left-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white">
          {matchScore}% match
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">{model.brand}</p>
          <h3 className="mt-0.5 text-sm font-bold text-[#1A1A1A] leading-tight">{model.model}</h3>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center">
          {[
            { label: "Monthly",  value: `£${emi}` },
            { label: "Range",    value: `${rangeM}mi` },
            { label: "Price",    value: `£${(model.price / 1000).toFixed(0)}k` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-[#F8FAF9] py-1.5">
              <p className="text-[10px] text-[#9CA3AF]">{label}</p>
              <p className="text-xs font-bold text-[#1A1A1A]">{value}</p>
            </div>
          ))}
        </div>

        {result.whyItFits[0] && (
          <p className="text-[11px] leading-5 text-[#6B7280] line-clamp-2">{result.whyItFits[0]}</p>
        )}

        <div className="mt-auto flex gap-2">
          <Link
            href={`/cars/${model.id}`}
            className="flex-1 rounded-xl border border-[#E5E7EB] py-2 text-center text-xs font-semibold text-[#374151] transition hover:border-[#1FBF9F] hover:text-[#1FBF9F]"
          >
            View Details
          </Link>
          <Link
            href={`/compare?carA=${model.id}`}
            className="flex-1 rounded-xl bg-[#1FBF9F] py-2 text-center text-xs font-semibold text-white transition hover:bg-[#17A589]"
          >
            Compare
          </Link>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-test-drive", { detail: { carId: model.id } }))}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D1D5DB] py-1.5 text-xs font-medium text-[#6B7280] transition hover:border-[#1FBF9F] hover:text-[#1FBF9F]"
        >
          <Calendar className="h-3.5 w-3.5" />
          Book Test Drive
        </button>
      </div>
    </div>
  );
}

function LeadModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interest_type: "quote", message: "Lead from AI Chat Advisor" }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      try { localStorage.setItem(LEAD_SHOWN_KEY, "1"); } catch { /* */ }
      setTimeout(onClose, 1800);
    } catch {
      setError("Unable to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {done ? (
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <BadgeCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold">You&apos;re on the list!</h3>
            <p className="text-sm text-[#6B7280]">We&apos;ll send you a personalised deal shortly.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-[#F3F4F6] px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#1FBF9F]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#1FBF9F]">Exclusive Offer</p>
                </div>
                <h2 className="mt-1 text-xl font-bold">Get a personalised deal</h2>
                <p className="mt-1 text-sm text-[#6B7280]">Based on your answers, we&apos;ll match you with the best available price.</p>
              </div>
              <button type="button" onClick={onClose} className="ml-4 rounded-full p-1.5 text-[#9CA3AF] hover:bg-[#F3F4F6]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4 px-6 py-6">
              {(["name", "email", "phone"] as const).map((f) => (
                <div key={f}>
                  <label className="mb-1.5 block text-sm font-medium capitalize text-[#374151]">{f}</label>
                  <input
                    required
                    type={f === "email" ? "email" : f === "phone" ? "tel" : "text"}
                    value={form[f]}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                    placeholder={f === "name" ? "Jane Smith" : f === "email" ? "jane@email.com" : "+44 7700 000000"}
                    className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-[#1FBF9F] focus:ring-2 focus:ring-[#D1F2EB]"
                  />
                </div>
              ))}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1FBF9F] py-3.5 text-sm font-bold text-white transition hover:bg-[#17A589] disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Get My Offer"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EVChatInterfaceProps {
  navOffset?: number;
}

export default function EVChatInterface({ navOffset = 73 }: EVChatInterfaceProps) {
  const [phase, setPhase]         = useState<"landing" | "chat">("landing");
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [answers, setAnswers]     = useState<Partial<MatchAnswers>>({});
  const [step, setStep]           = useState(0);          // current question index
  const [done, setDone]           = useState(false);      // all questions answered
  const [input, setInput]         = useState("");
  const [showLead, setShowLead]   = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { messages: m, answers: a, step: s, done: d } =
          JSON.parse(saved) as { messages: ChatMessage[]; answers: Partial<MatchAnswers>; step: number; done: boolean };
        if (m?.length) { setMessages(m); setAnswers(a ?? {}); setStep(s ?? 0); setDone(d ?? false); setPhase("chat"); }
      }
    } catch { /* */ }
  }, []);

  // Persist on change
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, answers, step, done })); } catch { /* */ }
    }
  }, [messages, answers, step, done]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  /** Fire tracking + record pipeline entry for logged-in users */
  async function recordChatCompletion(finalAnswers: Partial<MatchAnswers>, results: MatchResult[]) {
    void trackEvent({
      eventType: "recommendation_completed",
      carId: results[0]?.model.id ?? null,
      eventValue: { source: "ai_chat_advisor", match_count: results.length },
    });

    try {
      await fetch("/api/ai-match/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: finalAnswers,
          results: results.map((r) => ({
            modelId:    r.model.id,
            brand:      r.model.brand,
            model:      r.model.model,
            matchScore: r.matchScore,
          })),
        }),
      });
    } catch {
      // Non-blocking — never interrupt the user flow
    }
  }

  /** Start the conversation */
  function startChat(preAnswers?: Partial<MatchAnswers>) {
    const initial = preAnswers ?? {};
    // Find the first unanswered step
    const firstUnanswered = matchQuestions.findIndex((q) => !(q.key in initial));
    const startStep = firstUnanswered === -1 ? matchQuestions.length : firstUnanswered;

    const msgs: ChatMessage[] = [GREETING];
    if (startStep < matchQuestions.length) {
      msgs.push(buildQuestionMessage(startStep));
    }

    setMessages(msgs);
    setAnswers(initial);
    setStep(startStep);
    setDone(startStep >= matchQuestions.length);
    setPhase("chat");

    void trackEvent({ eventType: "recommendation_started", eventValue: { source: "ai_chat_advisor" } });

    if (startStep >= matchQuestions.length) {
      showResults({ ...defaultAnswers, ...initial });
    }
  }

  /** Record an answer and advance to next question or results */
  function recordAnswer(value: string, label: string, currentStep: number, currentAnswers: Partial<MatchAnswers>) {
    const q = matchQuestions[currentStep]!;
    const newAnswers = { ...currentAnswers, [q.key]: value || undefined } as Partial<MatchAnswers>;

    const nextStep = currentStep + 1;
    const allDone  = nextStep >= matchQuestions.length;

    // User bubble
    const userMsg: ChatMessage = { role: "user", text: label };

    if (allDone) {
      const merged = { ...defaultAnswers, ...newAnswers } as MatchAnswers;
      const results = getTopMatches(merged);
      const resultMsg: ChatMessage = {
        role: "bot",
        text: `Here are your top ${results.length} EV matches based on your answers:`,
        results,
        isFinal: true,
        chips: ["Start over", "Get a personalised deal", "Compare top two"],
        chipValues: ["__reset__", "__lead__", "__compare__"],
      };
      setMessages((prev) => [...prev, userMsg, resultMsg]);
      setAnswers(newAnswers);
      setStep(nextStep);
      setDone(true);

      // Record in CRM pipeline (non-blocking)
      void recordChatCompletion(newAnswers, results);

      // Lead modal after results
      try { if (!localStorage.getItem(LEAD_SHOWN_KEY)) setTimeout(() => setShowLead(true), 2000); } catch { /* */ }
    } else {
      const nextMsg = buildQuestionMessage(nextStep);
      setMessages((prev) => [...prev, userMsg, nextMsg]);
      setAnswers(newAnswers);
      setStep(nextStep);
    }
  }

  /** Show results directly (used for pre-filled answers) */
  function showResults(merged: MatchAnswers) {
    const results = getTopMatches(merged);
    const resultMsg: ChatMessage = {
      role: "bot",
      text: `Here are your top ${results.length} EV matches:`,
      results,
      isFinal: true,
      chips: ["Start over", "Get a personalised deal", "Compare top two"],
      chipValues: ["__reset__", "__lead__", "__compare__"],
    };
    setMessages((prev) => [...prev, resultMsg]);
  }

  function handleChip(chip: string, value: string) {
    if (value === "__reset__") { newChat(); return; }
    if (value === "__lead__")  { setShowLead(true); return; }
    if (value === "__compare__") {
      const last = messages.findLast((m) => m.results);
      if (last?.results && last.results.length >= 2) {
        window.location.href = `/compare?carA=${last.results[0]!.model.id}&carB=${last.results[1]!.model.id}`;
      }
      return;
    }
    if (!done) recordAnswer(value, chip, step, answers);
  }

  function handleTextSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    if (done) {
      // Free-form after results — just echo back a helpful nudge
      const userMsg: ChatMessage = { role: "user", text: trimmed };
      const botMsg: ChatMessage  = {
        role: "bot",
        text: "To refine your results, try starting a new chat or use the chips above. You can also compare vehicles or book a test drive directly from a card.",
        chips: ["Start over", "Get a personalised deal"],
        chipValues: ["__reset__", "__lead__"],
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
    } else {
      // Try to match typed input to an option value
      const q = matchQuestions[step]!;
      const matched = q.options?.find((o) =>
        trimmed.toLowerCase().includes(o.title.toLowerCase().split(" ")[0]!) ||
        trimmed.toLowerCase().includes(o.value)
      );
      const value = matched?.value ?? trimmed;
      const label = matched?.title ?? trimmed;
      recordAnswer(value, label, step, answers);
    }
  }

  function newChat() {
    setMessages([]);
    setAnswers({});
    setStep(0);
    setDone(false);
    setInput("");
    setPhase("landing");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); }
  }

  // ── Landing screen ──────────────────────────────────────────────────────────
  if (phase === "landing") {
    return (
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden bg-[#07090B] px-4 py-16"
        style={{ minHeight: `calc(100vh - ${navOffset}px)` }}
      >
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1FBF9F]/10 blur-[120px]" />

        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1FBF9F]/30 bg-[#1FBF9F]/10 px-4 py-1.5">
            <Zap className="h-3.5 w-3.5 text-[#1FBF9F]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1FBF9F]">AI Car Match Advisor</span>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Find your perfect EV</h1>
            <p className="mt-3 text-base text-zinc-400">Answer a few quick questions and we&apos;ll match you instantly.</p>
          </div>

          {/* Quick starters */}
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Quick start</p>
            <div className="flex flex-wrap gap-2">
              {LANDING_STARTERS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => startChat(s.answer)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-[#1FBF9F]/40 hover:bg-[#1FBF9F]/10 hover:text-[#1FBF9F]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => startChat()}
            className="flex items-center gap-2 rounded-2xl bg-[#1FBF9F] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#17A589]"
          >
            Start matching
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Chat screen ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-[#F8FAF9]" style={{ height: `calc(100vh - ${navOffset}px)` }}>

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D1F2EB] bg-[#E8F8F5]">
            <Bot className="h-4 w-4 text-[#1FBF9F]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">EV Guide AI</p>
            <p className="text-[11px] text-[#6B7280]">
              {done ? "Match complete" : `Step ${Math.min(step + 1, matchQuestions.length)} of ${matchQuestions.length}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:flex flex-1 mx-6 items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1FBF9F] transition-all duration-500"
              style={{ width: `${(Math.min(step, matchQuestions.length) / matchQuestions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-[#9CA3AF]">{Math.round((Math.min(step, matchQuestions.length) / matchQuestions.length) * 100)}%</span>
        </div>

        <button
          type="button"
          onClick={newChat}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#6B7280] transition hover:border-[#1FBF9F] hover:text-[#1FBF9F]"
        >
          <RotateCcw className="h-3 w-3" />
          Restart
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

            {/* Avatar */}
            <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full border ${
              msg.role === "user" ? "border-[#1FBF9F]/30 bg-[#E8F8F5]" : "border-[#E5E7EB] bg-white shadow-sm"
            }`}>
              {msg.role === "user"
                ? <User className="h-4 w-4 text-[#1FBF9F]" />
                : <Bot  className="h-4 w-4 text-[#6B7280]" />}
            </div>

            <div className={`flex max-w-[85%] flex-col gap-3 ${msg.role === "user" ? "items-end" : "items-start"}`}>

              {/* Bubble */}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                msg.role === "user"
                  ? "rounded-tr-sm bg-[#1FBF9F] text-white"
                  : "rounded-tl-sm border border-[#E5E7EB] bg-white text-[#1A1A1A] shadow-sm"
              }`}>
                {msg.text.split("\n").map((line, j) => (
                  <span key={j} className={j > 0 ? "block mt-1" : "block"}>{line}</span>
                ))}
              </div>

              {/* Car result cards */}
              {msg.results && msg.results.length > 0 && (
                <div className={`grid gap-3 w-full ${
                  msg.results.length === 1 ? "max-w-xs" :
                  msg.results.length === 2 ? "sm:grid-cols-2 max-w-lg" :
                  "sm:grid-cols-3"
                }`}>
                  {msg.results.map((r) => <CarCard key={r.model.id} result={r} />)}
                </div>
              )}

              {/* Option chips */}
              {msg.chips && msg.chips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.chips.map((chip, ci) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChip(chip, msg.chipValues?.[ci] ?? chip)}
                      className="rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] shadow-sm transition hover:border-[#1FBF9F] hover:bg-[#E8F8F5] hover:text-[#1FBF9F]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[#E5E7EB] bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3 transition focus-within:border-[#1FBF9F] focus-within:ring-2 focus-within:ring-[#D1F2EB]">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={done ? "Ask a follow-up question…" : "Type your answer or pick an option above…"}
              className="flex-1 resize-none bg-transparent text-sm text-[#1A1A1A] placeholder-[#9CA3AF] outline-none"
            />
            <button
              type="button"
              onClick={handleTextSend}
              disabled={!input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1FBF9F] text-white transition hover:bg-[#17A589] disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-[#9CA3AF]">Pick an option above or type your own answer</p>
        </div>
      </div>

      {showLead && <LeadModal onClose={() => setShowLead(false)} />}
    </div>
  );
}
