import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshIntentProfileForIdentity } from "@/lib/profiling/intent-profile";
import { refreshLeadScoreForIdentity } from "@/lib/scoring/lead-intent";
import { createClient } from "@/lib/supabase/server";

type IntentProfileGate = {
  id: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to book a test drive." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_intent_profiles")
    .select("id, intent_score, user_type, compare_count, visit_count")
    .eq("user_id", user.id)
    .maybeSingle();

  const intentProfile = (profile ?? null) as IntentProfileGate | null;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const rawEvModelId =
    typeof body.ev_model_id === "string" && body.ev_model_id.trim() ? body.ev_model_id.trim() : null;
  const evModelLabel = typeof body.ev_model_label === "string" && body.ev_model_label.trim() ? body.ev_model_label.trim() : null;
  const preferredDate = typeof body.preferred_date === "string" ? body.preferred_date.trim() : "";
  const preferredTimeSlot = typeof body.preferred_time_slot === "string" ? body.preferred_time_slot.trim() : "";
  const preferredLocation = typeof body.preferred_location === "string" ? body.preferred_location.trim() : "";
  const evModelId = rawEvModelId && UUID_REGEX.test(rawEvModelId) ? rawEvModelId : null;
  const normalizedVehicleLabel = evModelLabel ?? rawEvModelId;

  if (fullName.length < 2) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!preferredDate) {
    return NextResponse.json({ error: "Preferred date is required." }, { status: 400 });
  }
  if (!preferredTimeSlot) {
    return NextResponse.json({ error: "Preferred time is required." }, { status: 400 });
  }
  if (!preferredLocation) {
    return NextResponse.json({ error: "Preferred location is required." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("test_drive_bookings")
    .insert({
      profile_id: intentProfile?.id ?? null,
      user_id: user.id,
      full_name: fullName,
      email,
      phone: "Not provided",
      ev_model_id: evModelId,
      ev_model_label: normalizedVehicleLabel,
      preferred_date: preferredDate,
      preferred_time_slot: preferredTimeSlot,
      preferred_location: preferredLocation,
      current_vehicle: null,
      notes: null,
      status: "requested",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[test-drives] failed to insert booking:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: trackingError } = await admin.from("user_events").insert({
    user_id: user.id,
    session_id: null,
    car_id: evModelId,
    event_type: "test_drive_clicked",
    event_value: {
      booking_id: data.id,
      desired_vehicle: normalizedVehicleLabel,
      preferred_location: preferredLocation,
      preferred_date: preferredDate,
      preferred_time_slot: preferredTimeSlot,
    },
    page_path: "/appointment",
  });

  if (trackingError) {
    console.error("[test-drives] failed to insert tracking event:", trackingError.message);
  } else {
    await refreshLeadScoreForIdentity({ userId: user.id, sessionId: null });
    await refreshIntentProfileForIdentity({ userId: user.id, sessionId: null });
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}
