"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeadIntelligenceRow, LeadUserType, AffordabilityBand } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

type FilterType = "all" | LeadUserType;
type SortKey = "score" | "activity";

const RECOMMENDED_ACTION: Record<LeadUserType, { label: string; style: string }> = {
  casual: {
    label: "Nurture",
    style: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
  research: {
    label: "Send Offer",
    style: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  },
  buyer: {
    label: "Contact Now",
    style: "bg-red-50 text-red-700 ring-1 ring-red-200 font-bold",
  },
};

const BAND_STYLE: Record<AffordabilityBand, string> = {
  entry: "bg-slate-50 text-slate-600",
  mid: "bg-indigo-50 text-indigo-700",
  premium: "bg-amber-50 text-amber-700",
};

const USER_TYPE_STYLE: Record<LeadUserType, string> = {
  casual: "bg-slate-100 text-slate-600",
  research: "bg-blue-50 text-blue-700",
  buyer: "bg-red-50 text-red-700",
};

const STYLE_LABEL: Record<string, string> = {
  analytical_buyer: "Analytical",
  emotional_buyer: "Emotional",
  price_sensitive_buyer: "Price-sensitive",
  urgent_buyer: "Urgent",
};

const STYLE_PILL_STYLE: Record<string, string> = {
  analytical_buyer: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  emotional_buyer: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  price_sensitive_buyer: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  urgent_buyer: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const capped = Math.min(100, Math.max(0, score));
  const color =
    capped >= 71 ? "bg-red-500" : capped >= 31 ? "bg-blue-500" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${capped}%` }} />
      </div>
      <span className="tabular-nums text-xs font-bold text-slate-700">{capped}</span>
    </div>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs capitalize ${className}`}
    >
      {children}
    </span>
  );
}

function formatActivity(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

function buildCarHref(carId: string | null): string | null {
  if (!carId) return null;
  return `/cars/${carId}`;
}

function toConfidencePercent(confidence: number | null): string {
  if (confidence === null || !Number.isFinite(confidence)) return "";
  return `${Math.round(confidence * 100)}%`;
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTabsProps = {
  active: FilterType;
  totalCount: number;
  casualCount: number;
  researchCount: number;
  buyerCount: number;
  onSelect: (f: FilterType) => void;
};

function FilterTabs({
  active,
  totalCount,
  casualCount,
  researchCount,
  buyerCount,
  onSelect,
}: FilterTabsProps) {
  const tabs: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalCount },
    { key: "buyer", label: "Buyers", count: buyerCount },
    { key: "research", label: "Researching", count: researchCount },
    { key: "casual", label: "Casual", count: casualCount },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ key, label, count }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            active === key
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
          }`}
        >
          {label}{" "}
          <span
            className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
              active === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Sort selector ────────────────────────────────────────────────────────────

function SortSelector({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (s: SortKey) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <option value="score">Highest Score</option>
      <option value="activity">Latest Activity</option>
    </select>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <div className="py-20 text-center">
      <p className="text-4xl">🔍</p>
      <p className="mt-4 text-lg font-semibold text-slate-700">No leads found</p>
      <p className="mt-1 text-sm text-slate-400">
        {filter === "all"
          ? "No intent profiles have been generated yet. Visitor behavior populates this table automatically."
          : `No ${filter} visitors yet. They will appear here once enough events are tracked.`}
      </p>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function LeadRow({ lead }: { lead: LeadIntelligenceRow }) {
  const action = RECOMMENDED_ACTION[lead.user_type];
  const carHref = buildCarHref(lead.strongest_interest_car_id);

  return (
    <tr className="group border-b border-slate-100 transition-colors hover:bg-slate-50/70">
      {/* Identifier */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 shrink-0 rounded-full ${
              lead.user_type === "buyer"
                ? "bg-red-500"
                : lead.user_type === "research"
                  ? "bg-blue-500"
                  : "bg-slate-300"
            }`}
          />
          <span className="font-mono text-xs text-slate-600">{lead.displayId}</span>
          {lead.isAuthenticated && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Logged in
            </span>
          )}
        </div>
      </td>

      {/* Score */}
      <td className="px-4 py-3.5">
        <ScoreBar score={lead.intent_score} />
      </td>

      {/* User type */}
      <td className="px-4 py-3.5">
        <Pill className={USER_TYPE_STYLE[lead.user_type]}>
          {lead.user_type}
        </Pill>
      </td>

      {/* Buy window */}
      <td className="px-4 py-3.5 text-xs text-slate-500">
        {lead.predicted_buy_window}
      </td>

      {/* Strongest car */}
      <td className="px-4 py-3.5">
        {carHref && lead.strongestCarLabel ? (
          <Link
            href={carHref}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {lead.strongestCarLabel}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Affordability */}
      <td className="px-4 py-3.5">
        <Pill className={BAND_STYLE[lead.estimated_affordability_band]}>
          {lead.estimated_affordability_band}
        </Pill>
      </td>

      {/* Activity counters */}
      <td className="px-4 py-3.5">
        <div className="flex gap-3 text-xs text-slate-500">
          <span title="Total events">{lead.visit_count}ev</span>
          <span title="EMI uses">{lead.emi_usage_count}emi</span>
          <span title="Compares">{lead.compare_count}cmp</span>
        </div>
      </td>

      {/* Inferred behavior style */}
      <td className="px-4 py-3.5">
        {lead.inferred_buyer_style ? (
          <div>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                STYLE_PILL_STYLE[lead.inferred_buyer_style]
              }`}
              title={lead.inferred_buyer_style_reason ?? "Inferred from behavior patterns."}
            >
              {STYLE_LABEL[lead.inferred_buyer_style] ?? lead.inferred_buyer_style}
            </span>
            {lead.inferred_buyer_style_confidence !== null && (
              <p className="mt-1 text-[11px] text-slate-400">
                inferred {toConfidencePercent(lead.inferred_buyer_style_confidence)} confidence
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400" title={lead.inferred_buyer_style_reason ?? undefined}>
            Not enough signal
          </span>
        )}
      </td>

      {/* Last activity */}
      <td className="px-4 py-3.5 text-xs text-slate-500">
        {formatActivity(lead.last_activity_at)}
      </td>

      {/* Recommended action */}
      <td className="px-4 py-3.5">
        <Pill className={action.style}>{action.label}</Pill>
      </td>
    </tr>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type Props = {
  leads: LeadIntelligenceRow[];
  casualCount: number;
  researchCount: number;
  buyerCount: number;
};

export default function LeadIntelligenceTable({
  leads,
  casualCount,
  researchCount,
  buyerCount,
}: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortKey>("score");

  const filtered = useMemo(() => {
    const base =
      filter === "all" ? leads : leads.filter((l) => l.user_type === filter);

    return [...base].sort((a, b) => {
      if (sort === "score") return b.intent_score - a.intent_score;
      // Sort by latest activity descending; nulls sink to bottom.
      const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
      const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [leads, filter, sort]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <FilterTabs
          active={filter}
          totalCount={leads.length}
          casualCount={casualCount}
          researchCount={researchCount}
          buyerCount={buyerCount}
          onSelect={setFilter}
        />
        <SortSelector value={sort} onChange={setSort} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Visitor</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Buy Window</th>
                <th className="px-4 py-3">Top Interest</th>
                <th className="px-4 py-3">Budget Band</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Behavior Style (Inferred)</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-3 text-right text-xs text-slate-400">
        Showing {filtered.length} of {leads.length} profiles
        {leads.length === 500 && " (limit 500 — add pagination for more)"}
      </div>
    </div>
  );
}
