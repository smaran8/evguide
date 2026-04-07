"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type {
  CrmJourneyStage,
  CrmLeadListRow,
  CrmLeadPriority,
  CrmLeadStatus,
} from "@/types";

type StageFilter = "all" | CrmJourneyStage;
type StatusFilter = "all" | CrmLeadStatus;
type PriorityFilter = "all" | CrmLeadPriority;
type AuthFilter = "all" | "authenticated" | "anonymous";
type SortKey = "score" | "activity";

const STAGE_STYLES: Record<CrmJourneyStage, string> = {
  awareness: "bg-slate-100 text-slate-700",
  research: "bg-blue-50 text-blue-700",
  comparison: "bg-indigo-50 text-indigo-700",
  finance: "bg-amber-50 text-amber-700",
  conversion: "bg-emerald-50 text-emerald-700",
};

const STATUS_STYLES: Record<CrmLeadStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  qualified: "bg-blue-50 text-blue-700",
  nurture: "bg-violet-50 text-violet-700",
  hot: "bg-rose-50 text-rose-700",
  contacted: "bg-cyan-50 text-cyan-700",
  follow_up: "bg-amber-50 text-amber-700",
  converted: "bg-emerald-50 text-emerald-700",
  closed_lost: "bg-slate-200 text-slate-600",
};

const PRIORITY_STYLES: Record<CrmLeadPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-rose-50 text-rose-700",
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function CrmLeadTable({ leads }: { leads: CrmLeadListRow[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StageFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [auth, setAuth] = useState<AuthFilter>("all");
  const [sort, setSort] = useState<SortKey>("score");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return [...leads]
      .filter((lead) => {
        if (stage !== "all" && lead.journey_stage !== stage) return false;
        if (status !== "all" && lead.crm_status !== status) return false;
        if (priority !== "all" && lead.crm_priority !== priority) return false;
        if (auth === "authenticated" && !lead.isAuthenticated) return false;
        if (auth === "anonymous" && lead.isAuthenticated) return false;

        if (!normalizedQuery) return true;

        return [
          lead.displayId,
          lead.strongestCarLabel ?? "",
          lead.favorite_brand ?? "",
          lead.favorite_body_type ?? "",
          lead.crm_owner_name ?? "",
          lead.crm_tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sort === "score") return b.intent_score - a.intent_score;
        const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [auth, deferredQuery, leads, priority, sort, stage, status]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-100 px-5 py-4 lg:grid-cols-[2fr_repeat(5,minmax(0,1fr))]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by visitor, car, owner, or tag"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-blue-400"
        />
        <select value={stage} onChange={(event) => setStage(event.target.value as StageFilter)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="all">All stages</option>
          <option value="awareness">Awareness</option>
          <option value="research">Research</option>
          <option value="comparison">Comparison</option>
          <option value="finance">Finance</option>
          <option value="conversion">Conversion</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="qualified">Qualified</option>
          <option value="nurture">Nurture</option>
          <option value="hot">Hot</option>
          <option value="contacted">Contacted</option>
          <option value="follow_up">Follow up</option>
          <option value="converted">Converted</option>
          <option value="closed_lost">Closed lost</option>
        </select>
        <select value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select value={auth} onChange={(event) => setAuth(event.target.value as AuthFilter)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="all">All visitors</option>
          <option value="authenticated">Logged in</option>
          <option value="anonymous">Anonymous</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="score">Highest score</option>
          <option value="activity">Latest activity</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Visitor</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">CRM</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Top Interest</th>
              <th className="px-4 py-3">Journey</th>
              <th className="px-4 py-3">Last Seen</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-mono text-xs text-slate-500">{lead.displayId}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Intent {lead.intent_score} / 100
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lead.isAuthenticated ? "Logged-in user" : "Anonymous visitor"}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Pill className={STAGE_STYLES[lead.journey_stage]}>
                    {lead.journey_stage}
                  </Pill>
                  <p className="mt-2 max-w-[220px] text-xs text-slate-500">
                    {lead.journey_stage_reason}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <Pill className={STATUS_STYLES[lead.crm_status]}>
                    {lead.crm_status.replace("_", " ")}
                  </Pill>
                  <p className="mt-2 text-xs text-slate-500">
                    Owner: {lead.crm_owner_name ?? "Unassigned"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <Pill className={PRIORITY_STYLES[lead.crm_priority]}>
                    {lead.crm_priority}
                  </Pill>
                  {lead.crm_tags.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">{lead.crm_tags.join(", ")}</p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{lead.strongestCarLabel ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.favorite_brand ?? "No brand"} / {lead.favorite_body_type ?? "no body preference"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-xs text-slate-500">
                    {lead.total_page_views} page views, {lead.compare_count} compares, {lead.emi_usage_count} EMI actions
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Paths: {lead.primary_paths.length > 0 ? lead.primary_paths.join(" • ") : "-"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-slate-700">{formatDate(lead.last_activity_at)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Follow-up: {formatDate(lead.next_follow_up_at)}
                  </p>
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/crm/${lead.id}`}
                    className="inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Open lead
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-5 py-3 text-right text-xs text-slate-400">
        Showing {filtered.length} of {leads.length} CRM profiles
      </div>
    </div>
  );
}
