import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import {
  getPipelineLeads,
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  PRIORITY_COLORS,
  FINANCE_STATUS_COLORS,
} from "@/lib/lead-pipeline";

export const metadata = {
  title: "Lead Pipeline Board | EV Guide Admin",
  description: "Kanban-style view of all leads by pipeline stage.",
};

export const revalidate = 60;

export default async function PipelineBoardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const leads = await getPipelineLeads();

  const byStage = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, leads.filter((l) => l.pipeline_stage === s)]),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">CRM</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Pipeline Board</h1>
        <p className="mt-2 text-slate-500">
          {leads.length} leads across {PIPELINE_STAGES.length} stages. Stages are auto-suggested
          from score — promote manually as you progress each lead.
        </p>
      </div>

      {/* Kanban columns — horizontal scroll on small screens */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = byStage[stage] ?? [];
          const stageScore = STAGE_COLORS[stage];

          return (
            <div
              key={stage}
              className="min-w-[260px] flex-shrink-0 rounded-2xl border border-slate-200 bg-slate-50"
            >
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stageScore}`}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs font-bold text-slate-500">{stageLeads.length}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 p-3">
                {stageLeads.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-300">No leads</p>
                )}

                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    {/* Identity */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {lead.full_name ?? lead.display_id}
                        </p>
                        {lead.email && (
                          <p className="truncate text-xs text-slate-400">{lead.email}</p>
                        )}
                      </div>
                      <LeadScoreBadge
                        score={lead.score}
                        category={lead.category}
                        size="sm"
                      />
                    </div>

                    {/* Top vehicle */}
                    {lead.top_recommended_vehicle && (
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-medium">Match: </span>
                        {lead.top_recommended_vehicle}
                        {lead.recommendation_score
                          ? ` (${lead.recommendation_score}%)`
                          : ""}
                      </p>
                    )}

                    {/* Budget */}
                    {lead.consultation_budget_max && (
                      <p className="mt-1 text-xs text-slate-500">
                        Budget: £{lead.consultation_budget_max.toLocaleString()}
                      </p>
                    )}

                    {/* Finance status */}
                    {lead.finance_status && (
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${FINANCE_STATUS_COLORS[lead.finance_status]}`}
                      >
                        Finance: {lead.finance_status}
                      </span>
                    )}

                    {/* Priority + date */}
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_COLORS[lead.priority]}`}
                      >
                        {lead.priority}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(lead.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    {/* Assigned to */}
                    {lead.assigned_to && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Assigned: {lead.assigned_to}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        Pipeline stages are suggested automatically from lead score. Update them from the{" "}
        <a href="/admin/leads" className="text-blue-600 hover:underline">
          Lead Pipeline table
        </a>{" "}
        as leads progress.
      </p>
    </div>
  );
}
