import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiRecommendationRow } from "@/types/platform";

export const metadata = {
  title: "AI Recommendations | EV Guide Admin",
  description: "All recommendation engine outputs.",
};

export const revalidate = 60;

type RecWithConsult = AiRecommendationRow & {
  consultation: {
    main_reason_for_ev: string | null;
    budget_max_gbp: number | null;
    daily_miles: number | null;
  } | null;
};

async function getRecommendations(): Promise<RecWithConsult[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_recommendations")
    .select(
      "id, consultation_id, session_id, profile_id, confidence_score, explanation, recommendation_payload, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error("[admin/recommendations]", error?.message);
    return [];
  }

  const consultIds = [...new Set(data.map((r) => r.consultation_id).filter(Boolean))];
  const { data: consultations } = consultIds.length
    ? await admin
        .from("consultations")
        .select("id, main_reason_for_ev, budget_max_gbp, daily_miles")
        .in("id", consultIds)
    : { data: [] };

  const consultMap = new Map(
    (consultations ?? []).map((c: Record<string, unknown>) => [c.id as string, c]),
  );

  return (data as unknown as AiRecommendationRow[]).map((r) => ({
    ...r,
    consultation: (consultMap.get(r.consultation_id) as RecWithConsult["consultation"]) ?? null,
  }));
}

function extractTopVehicles(
  payload: Record<string, unknown>,
  maxCount = 3,
): Array<{ label: string; score: number; rank: number }> {
  const results = payload?.results as Array<Record<string, unknown>> | null;
  if (!results?.length) return [];
  return results.slice(0, maxCount).map((r) => ({
    label: (r.vehicle_label as string) ?? "Unknown",
    score: (r.match_score as number) ?? 0,
    rank:  (r.rank as number) ?? 0,
  }));
}

export default async function AdminRecommendationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const recs = await getRecommendations();

  const avgConfidence = recs.length
    ? Math.round(recs.reduce((s, r) => s + (r.confidence_score ?? 0), 0) / recs.length)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">AI Engine</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Recommendations</h1>
        <p className="mt-2 text-slate-500">
          All recommendation engine runs — each triggered when a user completes the consultation wizard.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total recommendations", value: recs.length,     sub: "Engine runs" },
          { label: "Avg confidence score",  value: avgConfidence,   sub: "% match score" },
          { label: "With consultation",     value: recs.filter((r) => r.consultation_id).length, sub: "Linked records" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {recs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
          No recommendations yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Session / Profile</th>
                <th className="px-4 py-3">Consultation</th>
                <th className="px-4 py-3">Top Matches</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Explanation</th>
                <th className="px-4 py-3">Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recs.map((rec) => {
                const vehicles = extractTopVehicles(rec.recommendation_payload);
                return (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      <p>{rec.session_id?.slice(0, 14) ?? "—"}…</p>
                      {rec.profile_id && (
                        <p className="text-slate-400">user:{rec.profile_id.slice(0, 8)}…</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {rec.consultation ? (
                        <div>
                          <p className="capitalize">
                            {rec.consultation.main_reason_for_ev?.replace(/_/g, " ") ?? "—"}
                          </p>
                          {rec.consultation.budget_max_gbp && (
                            <p className="text-xs text-slate-400">
                              Budget £{rec.consultation.budget_max_gbp.toLocaleString()}
                            </p>
                          )}
                          {rec.consultation.daily_miles && (
                            <p className="text-xs text-slate-400">
                              {rec.consultation.daily_miles} mi/day
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ol className="list-decimal list-inside space-y-0.5">
                        {vehicles.map((v) => (
                          <li key={v.rank} className="text-slate-700">
                            {v.label}{" "}
                            <span className="text-xs text-slate-400">{v.score}%</span>
                          </li>
                        ))}
                      </ol>
                    </td>
                    <td className="px-4 py-3">
                      {rec.confidence_score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${rec.confidence_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {rec.confidence_score}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-slate-500">
                      <p className="line-clamp-2">{rec.explanation ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(rec.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
