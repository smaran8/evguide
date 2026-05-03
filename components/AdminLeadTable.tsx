"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import {
  STAGE_LABELS,
  STAGE_COLORS,
  PRIORITY_COLORS,
  FINANCE_STATUS_COLORS,
  CATEGORY_COLORS,
} from "@/lib/lead-pipeline";
import type { PipelineLeadRow } from "@/lib/lead-pipeline";
import type { LeadScoreCategory, LeadPipelineStage } from "@/types/platform";

interface Props {
  leads: PipelineLeadRow[];
}

const CATEGORY_FILTERS: Array<{ value: LeadScoreCategory | "all"; label: string }> = [
  { value: "all",          label: "All"          },
  { value: "finance_ready", label: "Finance Ready" },
  { value: "hot",          label: "Hot"          },
  { value: "warm",         label: "Warm"         },
  { value: "cold",         label: "Cold"         },
];

const STAGE_FILTERS: Array<{ value: LeadPipelineStage | "all"; label: string }> = [
  { value: "all",       label: "All Stages"  },
  { value: "new",       label: "New"         },
  { value: "contacted", label: "Contacted"   },
  { value: "qualified", label: "Qualified"   },
  { value: "proposal",  label: "Proposal"    },
  { value: "converted", label: "Converted"   },
  { value: "lost",      label: "Lost"        },
];

function shortLeadIdentity(lead: PipelineLeadRow) {
  const rawId = lead.session_id ?? lead.profile_id ?? lead.id;
  return rawId ? `${rawId.slice(0, 12)}...` : "No session";
}

export default function AdminLeadTable({ leads }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<LeadScoreCategory | "all">("all");
  const [stageFilter,    setStageFilter]    = useState<LeadPipelineStage  | "all">("all");
  const [search,         setSearch]         = useState("");
  const [expandedId,     setExpandedId]     = useState<string | null>(null);

  const filtered = leads.filter((lead) => {
    if (categoryFilter !== "all" && lead.category !== categoryFilter) return false;
    if (stageFilter    !== "all" && lead.pipeline_stage !== stageFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        lead.display_id.toLowerCase().includes(q) ||
        (lead.email?.toLowerCase().includes(q) ?? false) ||
        (lead.full_name?.toLowerCase().includes(q) ?? false) ||
        (lead.top_recommended_vehicle?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by ID, email, or vehicle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategoryFilter(value as LeadScoreCategory | "all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                categoryFilter === value
                  ? value === "all"
                    ? "bg-slate-800 text-white"
                    : CATEGORY_COLORS[value as LeadScoreCategory]
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STAGE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStageFilter(value as LeadPipelineStage | "all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                stageFilter === value
                  ? value === "all"
                    ? "bg-slate-800 text-white"
                    : STAGE_COLORS[value as LeadPipelineStage]
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="ml-auto text-xs text-slate-400">{filtered.length} leads</p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
          No leads match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Consultation</th>
                <th className="px-4 py-3">Top Match</th>
                <th className="px-4 py-3">Finance</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lead) => (
                <Fragment key={lead.id}>
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  >
                    {/* Lead identity */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {lead.full_name ?? lead.display_id}
                      </p>
                      {lead.email && (
                        <p className="text-slate-400 text-xs">{lead.email}</p>
                      )}
                      <p className="text-slate-400 text-[10px] font-mono">{shortLeadIdentity(lead)}</p>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      <LeadScoreBadge score={lead.score} category={lead.category} />
                    </td>

                    {/* Consultation summary */}
                    <td className="px-4 py-3 text-slate-600">
                      {lead.consultation_id ? (
                        <div>
                          <p className="capitalize">{lead.consultation_reason?.replace(/_/g, " ") ?? "—"}</p>
                          {lead.consultation_budget_max && (
                            <p className="text-xs text-slate-400">
                              Budget £{lead.consultation_budget_max.toLocaleString()}
                            </p>
                          )}
                          {lead.consultation_daily_miles && (
                            <p className="text-xs text-slate-400">
                              {lead.consultation_daily_miles} mi/day
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">No consultation</span>
                      )}
                    </td>

                    {/* Top recommended vehicle */}
                    <td className="px-4 py-3 text-slate-700">
                      {lead.top_recommended_vehicle ? (
                        <div>
                          <p>{lead.top_recommended_vehicle}</p>
                          {lead.recommendation_score && (
                            <p className="text-xs text-slate-400">{lead.recommendation_score}% match</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Finance status */}
                    <td className="px-4 py-3">
                      {lead.finance_status ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${FINANCE_STATUS_COLORS[lead.finance_status]}`}
                        >
                          {lead.finance_status}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Pipeline stage */}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_COLORS[lead.pipeline_stage]}`}
                      >
                        {STAGE_LABELS[lead.pipeline_stage]}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PRIORITY_COLORS[lead.priority]}`}
                      >
                        {lead.priority}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(lead.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                    </td>

                    {/* Expand */}
                    <td className="px-4 py-3 text-right text-xs text-blue-600">
                      {expandedId === lead.id ? "▲" : "▼"}
                    </td>
                  </tr>

                  {/* Expanded scoring reasons */}
                  {expandedId === lead.id && (
                    <tr key={`${lead.id}-detail`} className="bg-slate-50">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {/* Scoring reasons */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Scoring reasons
                            </p>
                            {lead.scoring_reasons.length === 0 ? (
                              <p className="text-xs text-slate-400">No reasons recorded.</p>
                            ) : (
                              <ul className="space-y-1">
                                {lead.scoring_reasons.map((r, i) => (
                                  <li key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600">{r.label}</span>
                                    <span
                                      className={`font-semibold ${r.points >= 0 ? "text-emerald-600" : "text-red-500"}`}
                                    >
                                      {r.points >= 0 ? "+" : ""}{r.points}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Vehicle + finance details */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Details
                            </p>
                            <ul className="space-y-1 text-xs text-slate-600">
                              <li>Home charging: {lead.consultation_home_charging === true ? "Yes" : lead.consultation_home_charging === false ? "No" : "—"}</li>
                              {lead.finance_deposit && <li>Deposit: £{lead.finance_deposit.toLocaleString()}</li>}
                              {lead.finance_income_band && <li>Income band: {lead.finance_income_band.replace(/_/g, " ")}</li>}
                              {lead.pipeline_notes && <li>Notes: {lead.pipeline_notes}</li>}
                              {lead.assigned_to && <li>Assigned to: {lead.assigned_to}</li>}
                            </ul>
                          </div>

                          {/* Quick links */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Quick links
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {lead.consultation_id && (
                                <Link
                                  href={`/consultation/results?consultation_id=${lead.consultation_id}`}
                                  className="text-xs text-blue-600 hover:underline"
                                  target="_blank"
                                >
                                  View recommendation results →
                                </Link>
                              )}
                              {lead.finance_request_id && (
                                <Link
                                  href={`/admin/finance-requests`}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View finance request →
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-[10px] text-slate-400">
                          Last scored: {new Date(lead.last_calculated_at).toLocaleString("en-GB")}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
