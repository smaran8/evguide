import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLeadTable from "@/components/AdminLeadTable";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import { getPipelineLeads } from "@/lib/lead-pipeline";

export const metadata = {
  title: "Lead Pipeline | EV Guide Admin",
  description: "Platform lead scores, pipeline stages, and scoring intelligence.",
};

// Revalidate every 60 seconds so scores stay reasonably fresh
export const revalidate = 60;

function StatCard({
  label,
  value,
  sub,
  accent = "border-slate-200",
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${accent}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default async function PlatformLeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const leads = await getPipelineLeads();

  const financeReady = leads.filter((l) => l.category === "finance_ready").length;
  const hot          = leads.filter((l) => l.category === "hot").length;
  const warm         = leads.filter((l) => l.category === "warm").length;
  const withConsult  = leads.filter((l) => l.consultation_id).length;
  const withFinance  = leads.filter((l) => l.finance_request_id).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Lead Intelligence</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Lead Pipeline</h1>
        <p className="mt-2 text-slate-500">
          Platform-scored leads ranked by buying intent. Scores are computed from
          consultation, finance, comparison, and browsing behaviour.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Leads"     value={leads.length}  sub="Scored sessions"       accent="border-slate-200" />
        <StatCard label="Finance Ready"   value={financeReady}  sub="Score ≥ 75 · Act now"  accent="border-emerald-200" />
        <StatCard label="Hot"             value={hot}           sub="Score 50–74"            accent="border-orange-200" />
        <StatCard label="Warm"            value={warm}          sub="Score 25–49"            accent="border-amber-200" />
        <StatCard label="With Consult."   value={withConsult}   sub="Completed wizard"       accent="border-blue-200" />
        <StatCard label="Finance Requests" value={withFinance}  sub="Submitted forms"        accent="border-purple-200" />
      </div>

      {/* Top 3 finance-ready leads quick summary */}
      {financeReady > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Finance-ready leads — act now
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {leads
              .filter((l) => l.category === "finance_ready")
              .slice(0, 3)
              .map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {lead.full_name ?? lead.display_id}
                      </p>
                      {lead.email && (
                        <p className="text-xs text-slate-500">{lead.email}</p>
                      )}
                    </div>
                    <LeadScoreBadge score={lead.score} category={lead.category} size="sm" />
                  </div>
                  {lead.top_recommended_vehicle && (
                    <p className="mt-2 text-sm text-slate-600">
                      Top match: <span className="font-medium">{lead.top_recommended_vehicle}</span>
                    </p>
                  )}
                  {lead.consultation_budget_max && (
                    <p className="text-xs text-slate-500 mt-1">
                      Budget: £{lead.consultation_budget_max.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-20 text-center text-slate-400">
          <p className="text-sm">No scored leads yet.</p>
          <p className="mt-1 text-xs">
            Scores are written when users complete the consultation or trigger major events.
          </p>
        </div>
      ) : (
        <AdminLeadTable leads={leads} />
      )}
    </div>
  );
}
