"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  CarFront,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Map,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import RecommendationResults from "./RecommendationResults";
import {
  defaultAnswers,
  getTopMatches,
  matchQuestions,
  type MatchAnswers,
  type MatchQuestionOption,
} from "./recommendationEngine";

const questionIcons = [CircleDollarSign, Map, BatteryCharging, CarFront, Sparkles, ShieldCheck, MapPin];

export default function RecommendationForm() {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<MatchAnswers>(defaultAnswers);
  const [results, setResults] = useState<ReturnType<typeof getTopMatches> | null>(null);
  const [loading, setLoading] = useState(false);

  const currentQuestion = matchQuestions[stepIndex];
  const isLastStep = stepIndex === matchQuestions.length - 1;
  const currentValue = answers[currentQuestion.key];
  const progress = ((stepIndex + 1) / matchQuestions.length) * 100;

  const friendlyTitles: Partial<Record<keyof MatchAnswers, string>> = {
    budget: "What budget feels comfortable for your next EV?",
    mileage: "How far do you usually drive each week?",
    charging: "Where do you expect to do most of your charging?",
    bodyType: "What kind of EV would feel easiest to live with?",
    priority: "What matters most in the final decision?",
    condition: "Would you like us to consider new, used, or both?",
    postcode: "Enter your postcode for local charging and incentives.",
  };

  function updateAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  }

  function handleContinue() {
    if (!started) {
      setStarted(true);
      return;
    }

    if (isLastStep) {
      setLoading(true);
      setTimeout(() => {
        setResults(getTopMatches(answers));
        setLoading(false);
      }, 650);
      return;
    }

    setStepIndex((prev) => prev + 1);
  }

  function handleBack() {
    if (results) {
      setResults(null);
      setStepIndex(matchQuestions.length - 1);
      return;
    }

    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    } else {
      setStarted(false);
    }
  }

  function handleReset() {
    setStarted(false);
    setStepIndex(0);
    setAnswers(defaultAnswers);
    setResults(null);
    setLoading(false);
  }

  if (results) {
    return <RecommendationResults results={results} answers={answers} onReset={handleReset} />;
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/6 bg-[#07090B] pb-20 pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_32%),radial-gradient(circle_at_80%_18%,_rgba(6,182,212,0.16),_transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
                Premium AI Match
              </span>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
                Find your perfect EV in under 60 seconds.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
                Answer one question at a time and we will build a shortlist around affordability,
                charging reality, body style, and what matters most to your life.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500">
                AI Match helps you research options faster. It does not make legally binding or credit decisions,
                and you should verify important information independently.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-300">
                <TrustPill label="One question per screen" />
                <TrustPill label="Top 3 EVs only" />
                <TrustPill label="No signup required" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">What you get</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <HeroMetric label="Top matches" value="3 EVs" sub="A simple shortlist instead of a long feed." />
                <HeroMetric label="Decision signal" value="Match %" sub="A confidence score you can understand quickly." />
                <HeroMetric label="Money view" value="Monthly cost" sub="So the recommendation feels affordable, not abstract." />
                <HeroMetric label="Reassurance" value="Why it fits" sub="Clear reasoning in human language, not just specs." />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#090C0E] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 max-w-3xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
              How It Works
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              A calmer recommendation flow for a higher-confidence decision.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <InfoCard
              title="Tell us what your life looks like"
              description="We start with affordability and daily use so the shortlist feels personal and realistic right away."
              step="01"
              icon={CircleDollarSign}
            />
            <InfoCard
              title="We narrow the strongest fits"
              description="Charging setup, driving pattern, and body preference reduce overload before results appear."
              step="02"
              icon={Cpu}
            />
            <InfoCard
              title="You get a decision-ready shortlist"
              description="See only the top 3 EVs, why they fit, and the next step if one stands out."
              step="03"
              icon={Check}
            />
          </div>
        </div>
      </section>

      <section className="bg-[#07090B] pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl md:p-8">
            {!started ? (
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div>
                  <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
                    Start Match
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    We will guide you through 6 focused questions.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-zinc-400">
                    Each screen asks for one thing only, so the process feels simpler, lighter, and easier to finish on both desktop and mobile.
                  </p>
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                  >
                    Start Match
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6">
                  <div className="space-y-4">
                    {matchQuestions.map((question, index) => {
                      const Icon = questionIcons[index];
                      return (
                        <div key={question.key} className="flex items-center gap-4 rounded-[1.25rem] border border-white/6 bg-white/[0.03] p-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Question {index + 1}</p>
                            <p className="mt-1 text-sm font-medium text-white">{friendlyTitles[question.key] ?? question.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : loading ? (
              <LoadingState />
            ) : (
              <div>
                <div className="flex flex-col gap-5 border-b border-white/8 pb-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                      Question {stepIndex + 1} of {matchQuestions.length}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                      {friendlyTitles[currentQuestion.key] ?? currentQuestion.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
                      {currentQuestion.description}
                    </p>
                  </div>
                  <div className="min-w-[220px]">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">You are almost there. We only need a few more answers.</p>
                  </div>
                </div>

                <div className="mt-8">
                  {currentQuestion.type === "text" ? (
                    <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
                      <label className="block text-sm font-medium text-zinc-200">
                        Postcode
                      </label>
                      <input
                        type="text"
                        value={String(currentValue)}
                        onChange={(event) => updateAnswer(event.target.value)}
                        placeholder={currentQuestion.placeholder ?? "Enter postcode"}
                        className="mt-4 w-full rounded-3xl border border-white/10 bg-[#0B1116] px-5 py-4 text-lg text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                      />
                      <p className="mt-3 text-sm leading-6 text-zinc-500">
                        This is optional and only used to give a better estimate for charging and incentives.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {currentQuestion.options?.map((option) => (
                        <QuestionCard
                          key={option.value}
                          option={option}
                          selected={currentValue === option.value}
                          onClick={() => updateAnswer(option.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {stepIndex === 0 ? "Back to intro" : "Previous"}
                  </button>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                  >
                    {isLastStep ? "See my matches" : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function TrustPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
      {label}
    </span>
  );
}

function HeroMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{sub}</p>
    </div>
  );
}

function InfoCard({
  title,
  description,
  step,
  icon: Icon,
}: {
  title: string;
  description: string;
  step: string;
  icon: typeof Cpu;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Step {step}</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function QuestionCard({
  option,
  selected,
  onClick,
}: {
  option: MatchQuestionOption<string>;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.75rem] border p-5 text-left transition duration-300 ${
        selected
          ? "border-emerald-400/35 bg-emerald-400/10 shadow-[0_20px_40px_rgba(16,185,129,0.12)]"
          : "border-white/8 bg-black/20 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{option.title}</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{option.description}</p>
        </div>
        <div
          className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border ${
            selected ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/15 text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-18 text-center">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
      <h3 className="mt-6 text-2xl font-semibold text-white">Building your EV shortlist</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        We are narrowing the strongest fits so the result feels clear, calm, and easier to trust.
      </p>
      <div className="mt-8 w-full max-w-md space-y-3">
        {[
          "Budget fit",
          "Charging compatibility",
          "Body style preference",
          "Priority weighting",
        ].map((label) => (
          <div key={label} className="flex items-center gap-3 text-sm text-zinc-500">
            <span className="w-40 text-right">{label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
              <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
