import CrmLeadTable from "@/components/dealer/CrmLeadTable";
import TestDriveBookingsTable from "@/components/dealer/TestDriveBookingsTable";
import { getCrmLeadList, getRecentTestDriveBookings } from "@/lib/crm";

export const metadata = {
  title: "CRM Journey | EV Guide Admin",
  description: "Track behavior-based lead journeys, qualification status, and follow-up workflow.",
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

export default async function AdminCrmPage() {
  const [leads, testDriveBookings] = await Promise.all([
    getCrmLeadList(),
    getRecentTestDriveBookings(20),
  ]);

  const hotLeads = leads.filter((lead) => lead.crm_status === "hot" || lead.crm_priority === "urgent").length;
  const financeStage = leads.filter((lead) => lead.journey_stage === "finance").length;
  const conversionStage = leads.filter((lead) => lead.journey_stage === "conversion").length;
  const anonymousResearchers = leads.filter(
    (lead) => !lead.isAuthenticated && (lead.journey_stage === "research" || lead.journey_stage === "comparison")
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Behavior CRM</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Customer Journey CRM</h1>
        <p className="mt-2 max-w-3xl text-slate-500">
          Real user activity is now grouped into journey stages so the admin team can identify
          serious buyers, track their reading pattern, and run follow-up like a lightweight CRM.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tracked Profiles" value={leads.length} sub="All scored visitor identities" />
        <StatCard label="Hot Leads" value={hotLeads} sub="Hot status or urgent priority" />
        <StatCard label="Finance Stage" value={financeStage} sub="Reached price, EMI, or bank exploration" />
        <StatCard label="Anonymous Researchers" value={anonymousResearchers} sub="Good retargeting candidates" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Journey funnel snapshot</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {[
              { label: "Awareness", value: leads.filter((lead) => lead.journey_stage === "awareness").length },
              { label: "Research", value: leads.filter((lead) => lead.journey_stage === "research").length },
              { label: "Comparison", value: leads.filter((lead) => lead.journey_stage === "comparison").length },
              { label: "Finance", value: financeStage },
              { label: "Conversion", value: conversionStage },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">What this CRM tracks</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li>Page-by-page browsing and route journey</li>
            <li>Research depth from scroll and dwell milestones</li>
            <li>Recommendation wizard start and completion</li>
            <li>Finance and comparison intent actions</li>
            <li>Consultation conversion and CRM follow-up state</li>
          </ul>
        </div>
      </div>

      <CrmLeadTable leads={leads} />
      <TestDriveBookingsTable bookings={testDriveBookings} title="Recent Test Drive Requests" />
    </div>
  );
}
