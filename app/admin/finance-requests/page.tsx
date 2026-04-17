import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FINANCE_STATUS_COLORS } from "@/lib/lead-pipeline";
import type { FinanceRequestRow, FinanceRequestStatus } from "@/types/platform";

export const metadata = {
  title: "Finance Requests | EV Guide Admin",
  description: "All finance intent requests submitted by platform users.",
};

export const revalidate = 30;

const STATUSES: FinanceRequestStatus[] = ["new", "reviewing", "approved", "rejected", "converted"];

async function getFinanceRequests() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("finance_requests")
    .select(
      "id, session_id, profile_id, consultation_id, vehicle_id, deposit_gbp, " +
      "desired_term_months, estimated_income_band, target_monthly_budget_gbp, " +
      "employment_status, credit_self_rating, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("[admin/finance-requests]", error.message);
    return [] as FinanceRequestRow[];
  }
  return (data ?? []) as unknown as FinanceRequestRow[];
}

export default async function AdminFinanceRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const rows = await getFinanceRequests();

  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]),
  ) as Record<FinanceRequestStatus, number>;

  const avgDeposit = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + (r.deposit_gbp ?? 0), 0) / rows.length)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Finance Intelligence</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Finance Requests</h1>
        <p className="mt-2 text-slate-500">
          Submitted finance intent signals from platform users. Review, qualify, and convert.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => (
          <div
            key={s}
            className={`rounded-2xl border p-4 ${
              s === "new"       ? "border-blue-200 bg-blue-50"    :
              s === "reviewing" ? "border-amber-200 bg-amber-50"  :
              s === "approved"  ? "border-emerald-200 bg-emerald-50" :
              s === "converted" ? "border-purple-200 bg-purple-50" :
              "border-slate-200 bg-white"
            }`}
          >
            <p className="text-xs font-semibold capitalize text-slate-500">{s}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{byStatus[s]}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Avg deposit</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            £{avgDeposit.toLocaleString()}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
          No finance requests yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Session / Profile</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Monthly target</th>
                <th className="px-4 py-3">Income band</th>
                <th className="px-4 py-3">Employment</th>
                <th className="px-4 py-3">Credit rating</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    <p>{row.session_id?.slice(0, 14) ?? "—"}…</p>
                    {row.profile_id && (
                      <p className="text-slate-400">user:{row.profile_id.slice(0, 8)}…</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${FINANCE_STATUS_COLORS[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.deposit_gbp !== null
                      ? `£${row.deposit_gbp.toLocaleString()}`
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.desired_term_months ? `${row.desired_term_months} mo` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.target_monthly_budget_gbp !== null
                      ? `£${row.target_monthly_budget_gbp}/mo`
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">
                    {row.estimated_income_band?.replace(/_/g, " ") ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">
                    {row.employment_status?.replace(/_/g, " ") ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.credit_self_rating ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(row.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
