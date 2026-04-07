/**
 * lib/actions/vehicleQueries.ts
 *
 * Server action that fires when a user clicks "Select This EV"
 * on their recommendation results and submits their contact details.
 *
 * The record is saved to the `vehicle_queries` table and is
 * immediately visible to admins in the admin panel.
 */

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Input type for the query submission form
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleQueryInput = {
  // From the recommendation card
  evId:         string;
  evBrand:      string;
  evModelName:  string;
  score:        number;
  rank:         number;
  preferenceId: string | null;

  // Contact details from the modal form
  fullName: string;
  email:    string;
  phone:    string;
  notes:    string;
};

export type VehicleQueryResult =
  | { success: true }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Action: submitVehicleQuery
// ─────────────────────────────────────────────────────────────────────────────

export async function submitVehicleQuery(
  input: VehicleQueryInput,
): Promise<VehicleQueryResult> {
  // ── 1. Server-side validation ─────────────────────────────────────────────
  if (!input.fullName?.trim() || input.fullName.trim().length < 2) {
    return { success: false, error: "Please enter your full name." };
  }
  const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
  if (!input.email?.trim() || !emailRegex.test(input.email.trim())) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!input.evId?.trim()) {
    return { success: false, error: "Invalid vehicle selection." };
  }

  try {
    // ── 2. Get current user (optional) ──────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // ── 3. Save to DB using admin client (bypasses RLS for anon users) ───────
    const admin = createAdminClient();
    const { error } = await admin.from("vehicle_queries").insert({
      preference_id: input.preferenceId ?? null,
      user_id:       user?.id ?? null,
      ev_id:         input.evId,
      ev_brand:      input.evBrand,
      ev_model_name: input.evModelName,
      score:         input.score,
      rank:          input.rank,
      full_name:     input.fullName.trim(),
      email:         input.email.trim().toLowerCase(),
      phone:         input.phone?.trim() || null,
      notes:         input.notes?.trim() || null,
      status:        "new",
    });

    if (error) {
      console.error("[vehicleQueries] DB error:", error.message);
      return { success: false, error: "Could not save your query. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("[vehicleQueries] Unexpected error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: updateVehicleQueryStatus (used by admin panel)
// ─────────────────────────────────────────────────────────────────────────────

export type QueryStatus = "new" | "contacted" | "resolved";

export async function updateVehicleQueryStatus(
  id: string,
  status: QueryStatus,
): Promise<VehicleQueryResult> {
  if (!["new", "contacted", "resolved"].includes(status)) {
    return { success: false, error: "Invalid status." };
  }

  // Verify the caller is an admin before allowing any write
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorised." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "Unauthorised." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicle_queries")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Failed to update status." };
  }

  return { success: true };
}
