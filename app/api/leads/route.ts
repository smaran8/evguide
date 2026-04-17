import { NextResponse } from "next/server";
import { parseLeadPayload } from "@/lib/leads";
import { notifySecurityEvent } from "@/lib/security/alerts";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function buildPersistenceError(message: string, detail: string | null | undefined) {
  const devDetail = process.env.NODE_ENV !== "production" && detail ? ` (${detail})` : "";
  return `${message}${devDetail}`;
}

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "lead-capture", 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    await notifySecurityEvent({
      type: "rate-limit",
      message: "Lead capture submissions exceeded rate limit.",
    });

    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseLeadPayload(body);
  if (!parsed.data) {
    return NextResponse.json(
      {
        error: parsed.error ?? "Please review the form and try again.",
        fieldErrors: parsed.fieldErrors ?? {},
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    // Quote requests go to consultation_requests (visible in admin Consultations)
    if (parsed.data.interest_type === "quote") {
      const vehicleLabel =
        parsed.data.vehicle_label ??
        (body.vehicle_id ? `Vehicle ID: ${String(body.vehicle_id)}` : null);

      const { data, error } = await admin
        .from("consultation_requests")
        .insert({
          user_id: user?.id ?? null,
          full_name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          sector: "vehicle",
          ev_model_id: parsed.data.vehicle_id ?? null,
          ev_model_label: vehicleLabel,
          notes: parsed.data.message,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          "[leads/quote] consultation_requests insert failed:",
          error.code,
          error.message,
          error.details,
        );
        return NextResponse.json(
          {
            error: buildPersistenceError(
              "Unable to save your request right now. Please try again shortly.",
              error.message,
            ),
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, id: data.id }, { status: 201 });
    }

    // Compare/expert requests now use consultation_requests so they show up in admin Consultations
    // even when the legacy leads table is unavailable or incomplete.
    if (parsed.data.interest_type === "compare") {
      const { data, error } = await admin
        .from("consultation_requests")
        .insert({
          user_id: user?.id ?? null,
          full_name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          sector: "vehicle",
          ev_model_id: parsed.data.vehicle_id ?? null,
          ev_model_label: parsed.data.vehicle_label,
          notes: parsed.data.message,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          "[leads/compare] consultation_requests insert failed:",
          error.code,
          error.message,
          error.details,
        );
        return NextResponse.json(
          {
            error: buildPersistenceError(
              "Unable to save your request right now. Please try again shortly.",
              error.message,
            ),
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, id: data.id }, { status: 201 });
    }

    // All other interest types go to the leads table
    const { data, error } = await admin
      .from("leads")
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        vehicle_id: parsed.data.vehicle_id,
        interest_type: parsed.data.interest_type,
        budget: parsed.data.budget,
        message: parsed.data.message,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[leads] failed to insert lead:", error.code, error.message, error.details);
      return NextResponse.json(
        {
          error: buildPersistenceError(
            "Unable to save your request right now. Please try again shortly.",
            error.message,
          ),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    console.error("[leads] unexpected error:", err);
    return NextResponse.json(
      {
        error: buildPersistenceError(
          "Unable to save your request right now. Please try again shortly.",
          err instanceof Error ? err.message : String(err),
        ),
      },
      { status: 500 },
    );
  }
}
