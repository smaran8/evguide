import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import FinanceRequestForwardButton from "@/components/admin/FinanceRequestForwardButton";
import { FINANCE_STATUS_COLORS } from "@/lib/lead-pipeline";
import type { FinanceRequestRow, FinanceRequestStatus } from "@/types/platform";

export const metadata = {
  title: "Finance Requests | EV Guide Admin",
  description: "All finance intent requests submitted by platform users.",
};

export const revalidate = 30;

const STATUSES: FinanceRequestStatus[] = ["new", "reviewing", "approved", "rejected", "converted"];

type AdminFinanceRequestRow = FinanceRequestRow & {
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  lender_name: string | null;
  vehicle_label: string | null;
  notes: string | null;
  source: "finance_requests" | "finance_enquiries" | "consultation_requests";
  raw_status: string | null;
};

function isMissingFinanceRequestsTableError(message: string | null | undefined) {
  if (!message) return false;
  return (
    message.includes("Could not find the table 'public.finance_requests'") ||
    message.includes('relation "finance_requests" does not exist')
  );
}

function normalizeFinanceStatus(status: unknown): FinanceRequestStatus {
  return STATUSES.includes(status as FinanceRequestStatus) ? (status as FinanceRequestStatus) : "new";
}

function mapFinanceEnquiry(row: Record<string, unknown>): AdminFinanceRequestRow {
  const loanYears = row.loan_years as number | null;

  return {
    id: row.id as string,
    session_id: null,
    profile_id: null,
    consultation_id: null,
    vehicle_id: (row.vehicle_id as string | null) ?? null,
    deposit_gbp: (row.down_payment as number | null) ?? null,
    desired_term_months: typeof loanYears === "number" ? loanYears * 12 : null,
    estimated_income_band: null,
    target_monthly_budget_gbp: (row.monthly_emi as number | null) ?? null,
    employment_status: null,
    credit_self_rating: null,
    status: normalizeFinanceStatus(row.status),
    created_at: row.created_at as string,
    applicant_name: (row.name as string | null) ?? null,
    applicant_email: (row.email as string | null) ?? null,
    applicant_phone: (row.phone as string | null) ?? null,
    lender_name: (row.selected_bank as string | null) ?? null,
    vehicle_label: (row.vehicle_name as string | null) ?? null,
    notes: [
      row.selected_bank_interest_rate ? `APR: ${row.selected_bank_interest_rate}%` : null,
      row.vehicle_price ? `Vehicle price: GBP ${Math.round(row.vehicle_price as number).toLocaleString("en-GB")}` : null,
      row.processing_fee ? `Processing fee: GBP ${Math.round(row.processing_fee as number).toLocaleString("en-GB")}` : null,
      row.total_insurance_cost ? `Total insurance cost: GBP ${Math.round(row.total_insurance_cost as number).toLocaleString("en-GB")}` : null,
      row.total_payable ? `Total payable: GBP ${Math.round(row.total_payable as number).toLocaleString("en-GB")}` : null,
    ].filter(Boolean).join("\n") || null,
    source: "finance_enquiries",
    raw_status: (row.status as string | null) ?? null,
  };
}

function mapFinanceConsultation(row: Record<string, unknown>): AdminFinanceRequestRow {
  return {
    id: row.id as string,
    session_id: null,
    profile_id: (row.user_id as string | null) ?? null,
    consultation_id: row.id as string,
    vehicle_id: null,
    deposit_gbp: null,
    desired_term_months: null,
    estimated_income_band: null,
    target_monthly_budget_gbp: null,
    employment_status: null,
    credit_self_rating: null,
    status: normalizeFinanceStatus(row.status),
    created_at: row.created_at as string,
    applicant_name: (row.full_name as string | null) ?? null,
    applicant_email: (row.email as string | null) ?? null,
    applicant_phone: (row.phone as string | null) ?? null,
    lender_name: (row.bank_name as string | null) ?? null,
    vehicle_label: (row.ev_model_label as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    source: "consultation_requests",
    raw_status: (row.status as string | null) ?? null,
  };
}

function mapFinanceRequest(row: Record<string, unknown>): AdminFinanceRequestRow {
  return {
    ...(row as unknown as FinanceRequestRow),
    applicant_name: null,
    applicant_email: null,
    applicant_phone: null,
    lender_name: null,
    vehicle_label: null,
    notes: null,
    source: "finance_requests",
    raw_status: (row.status as string | null) ?? null,
  };
}

async function getFinanceRequests(): Promise<AdminFinanceRequestRow[]> {
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
    if (isMissingFinanceRequestsTableError(error.message)) {
      const fallback = await admin
        .from("finance_enquiries")
        .select(
          "id, name, email, phone, selected_bank, selected_bank_interest_rate, vehicle_id, vehicle_name, vehicle_price, down_payment, insurance_cost, processing_fee, total_insurance_cost, loan_years, monthly_emi, total_payable, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(300);

      if (fallback.error) {
        const consultationFallback = await admin
          .from("consultation_requests")
          .select("id, user_id, full_name, email, phone, sector, bank_name, ev_model_label, notes, status, created_at")
          .eq("sector", "bank")
          .order("created_at", { ascending: false })
          .limit(300);

        if (consultationFallback.error) {
          console.error("[admin/finance-requests]", consultationFallback.error.message);
          return [];
        }

        return ((consultationFallback.data ?? []) as Record<string, unknown>[]).map(mapFinanceConsultation);
      }

      return ((fallback.data ?? []) as Record<string, unknown>[]).map(mapFinanceEnquiry);
    }

    console.error("[admin/finance-requests]", error.message);
    return [];
  }
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapFinanceRequest);
}

export default async function AdminFinanceRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const { data: profile } = await supabase.from("profiles").select("role, department").eq("id", user.id).single();
  const role = profile?.role as string | undefined;
  const dept = profile?.department as string | null ?? null;
  const canAccess =
    role === "super_admin" ||
    !dept || // no department = pre-migration, allow full access
    dept === "management" ||
    (role === "admin" && (dept === "finance" || dept === "operations"));
  if (!canAccess) redirect("/admin");

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
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Employment</th>
                <th className="px-4 py-3">Credit rating</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Lender email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    <div className="mb-2 font-sans">
                      <p className="text-sm font-medium text-slate-900">{row.applicant_name ?? "Unknown applicant"}</p>
                      {row.applicant_email ? <p className="text-xs text-slate-500">{row.applicant_email}</p> : null}
                      {row.applicant_phone ? <p className="text-xs text-slate-400">{row.applicant_phone}</p> : null}
                    </div>
                    <p>{row.session_id?.slice(0, 14) ?? "—"}…</p>
                    {row.profile_id && (
                      <p className="text-slate-400">user:{row.profile_id.slice(0, 8)}…</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${FINANCE_STATUS_COLORS[row.status]}`}
                    >
                      {row.raw_status ?? row.status}
                    </span>
                    <p className="mt-2 text-xs font-medium text-slate-700">{row.lender_name ?? "Lender not selected"}</p>
                    <p className="text-xs text-slate-400">{row.vehicle_label ?? row.vehicle_id ?? "Vehicle not provided"}</p>
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
                  <td className="max-w-sm px-4 py-3 text-xs text-slate-600">
                    {row.notes ? <p className="mb-2 line-clamp-5 whitespace-pre-line">{row.notes}</p> : null}
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
                  <td className="px-4 py-3">
                    <FinanceRequestForwardButton
                      consultationId={row.consultation_id}
                      lenderName={row.lender_name}
                      applicantName={row.applicant_name}
                      applicantEmail={row.applicant_email}
                      applicantPhone={row.applicant_phone}
                      vehicleLabel={row.vehicle_label}
                      depositGbp={row.deposit_gbp}
                      termMonths={row.desired_term_months}
                      monthlyPaymentGbp={row.target_monthly_budget_gbp}
                      notes={row.notes}
                    />
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
