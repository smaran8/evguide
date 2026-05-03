import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminConsultationStatusButton from "@/components/AdminConsultationStatusButton";
import AdminConsultationForwardButton from "@/components/AdminConsultationForwardButton";

type ConsultationRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  sector: string;
  bank_name: string | null;
  ev_model_label: string | null;
  ev_models: { brand: string; model: string }[] | null;
  preferred_time: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

async function getConsultations(): Promise<ConsultationRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("consultation_requests")
    .select("id, full_name, email, phone, sector, bank_name, ev_model_label, ev_models(brand, model), preferred_time, notes, status, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as ConsultationRow[];
}

export default async function AdminConsultationsPage() {
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
    (role === "admin" && (dept === "sales" || dept === "support" || dept === "operations"));
  if (!canAccess) redirect("/admin");

  const rows = await getConsultations();
  const vehicleRows = rows.filter((row) => row.sector === "vehicle");

  function renderTable(sectionRows: ConsultationRow[]) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name / Email</th>
              <th className="px-4 py-3">Selection</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Preferred time</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sectionRows.map((row) => {
              const evLabel =
                row.ev_model_label ||
                (Array.isArray(row.ev_models) && row.ev_models[0]
                  ? `${row.ev_models[0].brand} ${row.ev_models[0].model}`
                  : null);

              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.full_name}</p>
                    <p className="text-slate-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>
                        {row.sector === "bank"
                          ? row.bank_name
                          : row.sector === "finance"
                          ? evLabel ?? "Finance request"
                          : evLabel ?? "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{row.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {row.preferred_time
                      ? new Date(row.preferred_time).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "-"}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-500">
                    <p className="line-clamp-2">{row.notes ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(row.created_at).toLocaleDateString("en-GB", {
                      dateStyle: "medium",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <AdminConsultationStatusButton
                      id={row.id}
                      initialStatus={row.status}
                    />
                    <AdminConsultationForwardButton
                      id={row.id}
                      sector={row.sector}
                      bankName={row.bank_name}
                      applicantName={row.full_name}
                      applicantEmail={row.email}
                      applicantPhone={row.phone}
                      selectedVehicle={evLabel}
                      preferredTime={row.preferred_time}
                      notes={row.notes}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultation Requests</h1>
          <p className="mt-1 text-sm text-slate-500">{vehicleRows.length} total requests</p>
        </div>
      </div>

      {vehicleRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          No vehicle consultation requests yet.
        </div>
      ) : (
        renderTable(vehicleRows)
      )}
    </div>
  );
}
