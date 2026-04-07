import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evModels } from "@/data/evModels";
import LeadIntelligenceTable from "@/components/dealer/LeadIntelligenceTable";
import type { LeadIntelligenceRow, UserIntentProfileRow, AffordabilityBand, LeadUserType } from "@/types";

export const metadata = {
  title: "Lead Intelligence | EV Guide Admin",
  description: "See which visitors are most likely to buy — scored, segmented, and ranked.",
};

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getLeads(): Promise<LeadIntelligenceRow[]> {
  const admin = createAdminClient();

  // Fetch all intent profiles, newest activity first.
  // Limit 500 — a second page or cursor can be added when needed.
  const { data, error } = await admin
    .from("user_intent_profiles")
    .select(
      "id, user_id, session_id, intent_score, user_type, predicted_buy_window, " +
      "estimated_affordability_band, strongest_interest_car_id, favorite_brand, " +
      "favorite_body_type, visit_count, emi_usage_count, compare_count, " +
      "inferred_buyer_style, inferred_buyer_style_confidence, inferred_buyer_style_reason, " +
      "last_activity_at"
    )
    .order("intent_score", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[leads] failed to fetch user_intent_profiles:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as UserIntentProfileRow[];

  // Enrich each row: resolve car name + build display identifier
  return rows.map((row): LeadIntelligenceRow => {
    const carModel = row.strongest_interest_car_id
      ? evModels.find((m) => m.id === row.strongest_interest_car_id)
      : null;

    const strongestCarLabel = carModel
      ? `${carModel.brand} ${carModel.model}`
      : null;

    // Build readable display ID:
    //  - logged-in users → masked form of user_id UUID ("user:a1b2c3…")
    //  - anonymous       → first 16 chars of session_id
    const displayId = row.user_id
      ? `user:${row.user_id.slice(0, 8)}`
      : row.session_id
        ? row.session_id.slice(0, 16)
        : row.id.slice(0, 8);

    return {
      id: row.id,
      displayId,
      isAuthenticated: Boolean(row.user_id),
      intent_score: row.intent_score,
      user_type: row.user_type as LeadUserType,
      predicted_buy_window: row.predicted_buy_window,
      estimated_affordability_band: (row.estimated_affordability_band ?? "entry") as AffordabilityBand,
      strongestCarLabel,
      strongest_interest_car_id: row.strongest_interest_car_id,
      favorite_brand: row.favorite_brand,
      favorite_body_type: row.favorite_body_type,
      visit_count: row.visit_count,
      emi_usage_count: row.emi_usage_count,
      compare_count: row.compare_count,
      inferred_buyer_style: row.inferred_buyer_style,
      inferred_buyer_style_confidence: row.inferred_buyer_style_confidence,
      inferred_buyer_style_reason: row.inferred_buyer_style_reason,
      last_activity_at: row.last_activity_at,
    };
  });
}

// ─── Stat cards ────────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: number;
  sub?: string;
  accent: string;
};

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${accent}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function LeadIntelligencePage() {
  // Auth guard — mirrors the pattern used in /admin/consultations and other admin pages.
  // TODO: when a "dealer" role is introduced, add `profile.role !== "dealer"` here
  //       so dealers can access this page without needing full admin access.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const leads = await getLeads();

  // Aggregate counts for stat cards
  const buyerCount = leads.filter((l) => l.user_type === "buyer").length;
  const researchCount = leads.filter((l) => l.user_type === "research").length;
  const casualCount = leads.filter((l) => l.user_type === "casual").length;
  const highScoreCount = leads.filter((l) => l.intent_score >= 70).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-blue-600">Buyer Intelligence</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Lead Intelligence</h1>
        <p className="mt-2 text-slate-500">
          Visitors ranked by purchase intent — updated after every interaction.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Profiles"
          value={leads.length}
          sub="All tracked sessions"
          accent="border-slate-200"
        />
        <StatCard
          label="Ready to Buy"
          value={buyerCount}
          sub="Score 71–100 · Contact now"
          accent="border-red-200"
        />
        <StatCard
          label="Actively Researching"
          value={researchCount}
          sub="Score 31–70 · Send an offer"
          accent="border-blue-200"
        />
        <StatCard
          label="High-Intent (70+)"
          value={highScoreCount}
          sub="Across all segments"
          accent="border-amber-200"
        />
      </div>

      {/* Lead table (client component — owns filter + sort state) */}
      <LeadIntelligenceTable
        leads={leads}
        casualCount={casualCount}
        researchCount={researchCount}
        buyerCount={buyerCount}
      />
    </div>
  );
}
