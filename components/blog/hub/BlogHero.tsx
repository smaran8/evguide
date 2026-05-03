import { Search } from "lucide-react";
import type { BlogHeroProps } from "./types";

export default function BlogHero({
  query,
  onQueryChange,
  activeCategory,
  onCategoryChange,
  quickCategories,
}: BlogHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[#E5E7EB] pt-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#6B7280]">
            Content hub for smarter EV decisions
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            EV guides, comparisons, and buying insights
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#6B7280] sm:text-lg">
            Make smarter EV decisions with expert content, comparisons, and cost breakdowns.
          </p>

          <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/6 bg-white/80 px-5 py-4 text-left transition focus-within:border-emerald-400/30 focus-within:shadow-[0_0_0_1px_rgba(16,185,129,0.25)]">
              <Search className="h-5 w-5 text-[#6B7280]" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                type="search"
                placeholder="Search buying guides, EV comparisons, charging advice..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 sm:text-base"
                aria-label="Search blog articles"
              />
            </label>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {quickCategories.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryChange(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition duration-300 ${
                    active
                      ? "border-cyan-300/50 bg-cyan-400/12 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                      : "border-[#E5E7EB] bg-[#F8FAF9] text-[#6B7280] hover:border-emerald-400/25 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
