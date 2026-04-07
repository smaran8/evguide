import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, adminUserId: user.id };
}

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const emailToRaw = typeof body.emailTo === "string" ? body.emailTo.trim() : "";

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid test-drive booking id." }, { status: 400 });
  }

  const configuredDealerEmail = process.env.MG_DEALER_EMAIL?.trim() ?? "";
  const toEmail = emailToRaw || configuredDealerEmail;
  if (!toEmail || !EMAIL_REGEX.test(toEmail)) {
    return NextResponse.json({ error: "A valid MG dealer email is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("test_drive_bookings")
    .select("id, full_name, email, ev_model_label, preferred_date, preferred_time_slot, preferred_location, status, admin_notes, created_at")
    .eq("id", id)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Test-drive booking not found." }, { status: 404 });
  }

  const vehicleLabel = booking.ev_model_label?.trim() ?? "";
  if (!vehicleLabel.toLowerCase().includes("mg")) {
    return NextResponse.json({ error: "Only MG leads can be forwarded through this action." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "EV Guide <onboarding@resend.dev>";

  const submittedAtText = booking.created_at
    ? new Date(booking.created_at).toLocaleString("en-GB", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "Unknown";

  const { error: emailError } = await resend.emails.send({
    from: fromAddress,
    to: toEmail,
    replyTo: booking.email,
    subject: `EV Guide Lead - MG Test Drive Request - ${booking.full_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
        <h2 style="margin-bottom: 12px;">MG Test Drive Lead</h2>
        <p>EV Guide is forwarding a customer who requested a test drive for an MG vehicle.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p><strong>Vehicle:</strong> ${vehicleLabel}</p>
        <p><strong>Customer Name:</strong> ${booking.full_name}</p>
        <p><strong>Customer Email:</strong> ${booking.email}</p>
        <p><strong>Preferred Date:</strong> ${booking.preferred_date}</p>
        <p><strong>Preferred Time:</strong> ${booking.preferred_time_slot}</p>
        <p><strong>Preferred Location:</strong> ${booking.preferred_location}</p>
        <p><strong>Submitted At:</strong> ${submittedAtText}</p>
        <p><strong>Reference ID:</strong> ${booking.id}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 12px; color: #64748b;">Forwarded by EV Guide Admin CRM.</p>
      </div>
    `,
  });

  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 502 });
  }

  const nextAdminNote = [
    booking.admin_notes?.trim(),
    `Forwarded to MG dealer (${toEmail}) on ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { error: updateError } = await admin
    .from("test_drive_bookings")
    .update({
      status: "reviewing",
      admin_notes: nextAdminNote,
    })
    .eq("id", booking.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Lead forwarded to MG dealer.",
    forwardedTo: toEmail,
  });
}
