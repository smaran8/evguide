/**
 * app/admin/vehicle-queries/page.tsx
 *
 * Admin view: all vehicle queries submitted via the "Select This EV"
 * recommendation flow.  Each row shows the user's contact details,
 * which EV they selected, their match score, and the current status.
 *
 * Admins can update the status (new → contacted → resolved) inline.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import VehicleQueryStatusButton from "@/components/AdminVehicleQueryStatusButton";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type QueryRow = {
  id:            string;
  ev_brand:      string;
  ev_model_name: string;
  score:         number | null;
  rank:          number | null;
  full_name:     string;
  email:         string;
  phone:         string | null;
  notes:         string | null;
  status:        "new" | "contacted" | "resolved";
  created_at:    string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Data fetch
// ─────────────────────────────────────────────────────────────────────────────
async function getVehicleQueries(): Promise<QueryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicle_queries")
    .select("id, ev_brand, ev_model_name, score, rank, full_name, email, phone, notes, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/vehicle-queries] fetch error:", error.message);
    return [];
  }
  return (data ?? []) as QueryRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default async function VehicleQueriesAdminPage() {
  // Guard: must be admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const rows   = await getVehicleQueries();
  const newCount        = rows.filter((r) => r.status === "new").length;
  const contactedCount  = rows.filter((r) => r.status === "contacted").length;
  const resolvedCount   = rows.filter((r) => r.status === "resolved").length;

  // Colour config per status
  const statusConfig: Record<QueryRow["status"], { label: string; dot: string; row: string }> = {
    new:       { label: "New",       dot: "bg-blue-500",    row: "" },
    contacted: { label: "Contacted", dot: "bg-amber-500",   row: "bg-amber-50/40" },
    resolved:  { label: "Resolved",  dot: "bg-emerald-500", row: "bg-emerald-50/30" },
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vehicle Queries</h1>
          <p className="mt-1 text-sm text-slate-500">
            Leads generated from the &quot;Find My EV&quot; recommendation flow — users who selected a vehicle.
          </p>
        </div>
        <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
          {rows.length} total
        </span>
      </div>

      {/* ── Summary stats ── */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="New" count={newCount} colour="border-blue-200 bg-blue-50 text-blue-900" />
        <StatCard label="Contacted" count={contactedCount} colour="border-amber-200 bg-amber-50 text-amber-900" />
        <StatCard label="Resolved" count={resolvedCount} colour="border-emerald-200 bg-emerald-50 text-emerald-900" />
      </div>

      {/* ── Queries table ── */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400">
            <p className="text-4xl">📭</p>
            <p className="mt-3 font-semibold">No vehicle queries yet</p>
            <p className="mt-1 text-sm">They will appear here once users submit enquiries via the recommendation flow.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Vehicle Interested In</th>
                  <th className="px-5 py-3">Match</th>
                  <th className="px-5 py-3">Contact Details</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const cfg = statusConfig[row.status];
                  return (
                    <tr key={row.id} className={`transition-colors hover:bg-slate-50 ${cfg.row}`}>
                      {/* Vehicle */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {row.ev_brand} {row.ev_model_name}
                        </p>
                        {row.rank !== null && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            Ranked #{row.rank} recommendation
                          </p>
                        )}
                      </td>

                      {/* Score */}
                      <td className="px-5 py-4">
                        {row.score !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${row.score}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">
                              {row.score}
                              <span className="font-normal text-slate-400">/100</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">{row.full_name}</p>
                        <a
                          href={`mailto:${row.email}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {row.email}
                        </a>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 text-slate-500">
                        {row.phone ? (
                          <a href={`tel:${row.phone}`} className="hover:text-slate-800">
                            {row.phone}
                          </a>
                        ) : "—"}
                      </td>

                      {/* Notes */}
                      <td className="max-w-[180px] px-5 py-4 text-slate-500">
                        {row.notes ? (
                          <p className="line-clamp-2 text-xs">{row.notes}</p>
                        ) : "—"}
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-5 py-4 text-slate-400 text-xs">
                        {new Date(row.created_at).toLocaleDateString("en-GB", {
                          day:   "numeric",
                          month: "short",
                          year:  "numeric",
                        })}
                        <br />
                        {new Date(row.created_at).toLocaleTimeString("en-GB", {
                          hour:   "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`}
                          />
                          <span className="text-xs font-semibold capitalize text-slate-700">
                            {cfg.label}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <VehicleQueryStatusButton queryId={row.id} currentStatus={row.status} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small stat card helper ────────────────────────────────────────────────────
function StatCard({ label, count, colour }: { label: string; count: number; colour: string }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colour}`}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{count}</p>
    </div>
  );
}

