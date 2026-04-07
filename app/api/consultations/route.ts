import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshIntentProfileForIdentity } from "@/lib/profiling/intent-profile";
import { refreshLeadScoreForIdentity } from "@/lib/scoring/lead-intent";
import { Resend } from "resend";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please log in to submit consultation requests." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { full_name, email, phone, sector, bank_name, ev_model_id, ev_model_label, preferred_time, notes } = body as Record<string, string>;

  if (!full_name?.trim() || full_name.trim().length < 2) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }
  if (!email?.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (sector !== "bank" && sector !== "vehicle") {
    return NextResponse.json({ error: "Sector must be 'bank' or 'vehicle'." }, { status: 400 });
  }
  if (sector === "bank" && !bank_name?.trim()) {
    return NextResponse.json({ error: "Please select a bank." }, { status: 400 });
  }
  if (sector === "vehicle" && !ev_model_id?.trim() && !ev_model_label?.trim()) {
    return NextResponse.json({ error: "Please select or enter a vehicle." }, { status: 400 });
  }
  if (ev_model_id && !UUID_REGEX.test(ev_model_id)) {
    return NextResponse.json({ error: "Invalid vehicle selection." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("consultation_requests")
    .insert({
      user_id: user.id,
      full_name: full_name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      sector,
      bank_name: sector === "bank" ? bank_name?.trim() : null,
      ev_model_id: sector === "vehicle" && ev_model_id ? ev_model_id : null,
      ev_model_label: sector === "vehicle" ? (ev_model_label?.trim() || null) : null,
      preferred_time: preferred_time || null,
      notes: notes?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const consultationTrackingEvent =
    sector === "bank" ? "finance_apply_clicked" : "consultation_submitted";

  const { error: trackingError } = await admin.from("user_events").insert({
    user_id: user.id,
    session_id: null,
    car_id: sector === "vehicle" && ev_model_id ? ev_model_id : null,
    event_type: consultationTrackingEvent,
    event_value: {
      consultation_id: data.id,
      sector,
      bank_name: sector === "bank" ? bank_name?.trim() ?? null : null,
      ev_model_label: sector === "vehicle" ? ev_model_label?.trim() ?? null : null,
    },
    page_path: sector === "bank" ? "/finance" : "/appointment",
  });

  if (trackingError) {
    console.error("[consultations] tracking insert failed:", trackingError.message);
  } else {
    await refreshLeadScoreForIdentity({ userId: user.id, sessionId: null });
    await refreshIntentProfileForIdentity({ userId: user.id, sessionId: null });
  }

  // Send confirmation email (fire-and-forget — don't fail the request if email fails)
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "EV Guide <onboarding@resend.dev>";

    if (resendKey) {
      const resend = new Resend(resendKey);
      const selectionLine =
        sector === "bank"
          ? `<strong>Bank:</strong> ${bank_name}`
          : `<strong>Vehicle:</strong> ${ev_model_label ?? ev_model_id}`;

      const preferredLine = preferred_time
        ? `<strong>Preferred time:</strong> ${new Date(preferred_time).toLocaleString("en-GB", {
            dateStyle: "long",
            timeStyle: "short",
          })}`
        : null;

      await resend.emails.send({
        from: fromAddress,
        to: email.trim(),
        subject: "EV Guide — Your Consultation Request Has Been Received",
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#1d4ed8;padding:32px 40px;">
          <p style="margin:0;color:#bfdbfe;font-size:12px;letter-spacing:2px;text-transform:uppercase;">EV Guide</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">Consultation Request Received</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;color:#334155;">
          <p style="margin:0 0 16px;font-size:16px;">Dear <strong>${full_name.trim()}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
            Thank you for reaching out to EV Guide. We have successfully received your consultation request and our team will be reviewing your details shortly.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
            We will be in touch with you via a follow-up email to confirm your scheduled meeting and share further details regarding your consultation.
          </p>

          <!-- Summary box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:0;margin:0 0 24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#64748b;">Your Request Summary</p>
              <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Consultation type:</strong> ${sector === "bank" ? "Bank Finance" : "EV Vehicle"}</p>
              <p style="margin:0 0 6px;font-size:14px;color:#334155;">${selectionLine}</p>
              ${preferredLine ? `<p style="margin:0 0 6px;font-size:14px;color:#334155;">${preferredLine}</p>` : ""}
              <p style="margin:0;font-size:14px;color:#334155;"><strong>Reference ID:</strong> ${data.id}</p>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
            If you have any immediate questions, please feel free to reply to this email and our team will be happy to assist you.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.6;">
            Warm regards,<br />
            <strong>The EV Guide Consultation Team</strong>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            This is an automated confirmation. Please do not reply directly to this message.<br />
            EV Guide &mdash; Your trusted electric vehicle advisory platform.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
    }
  } catch {
    // Email failure is non-fatal — the request was saved successfully
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}
