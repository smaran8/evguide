import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/security/rate-limit";
import type { UpdateConsultationPayload, ConsultationAnswerPayload } from "@/types/consultation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid consultation id." }, { status: 400 });
    }

    const rateLimit = applyRateLimit(request, "consultation-update", 60, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let body: UpdateConsultationPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Extract answers from the payload before building the DB update
    const { answers, ...fields } = body;

    // Build a clean update object — only include explicitly provided keys
    const update: Record<string, unknown> = {};
    const allowedFields: Array<keyof typeof fields> = [
      "main_reason_for_ev",
      "budget_min_gbp",
      "budget_max_gbp",
      "target_monthly_payment_gbp",
      "daily_miles",
      "weekly_miles",
      "yearly_miles",
      "family_size",
      "home_charging",
      "public_charging_ok",
      "body_type_preference",
      "brand_preference",
      "range_priority",
      "performance_priority",
      "notes",
    ];

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        update[key] = fields[key] ?? null;
      }
    }

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await admin
        .from("consultations")
        .update(update)
        .eq("id", id);

      if (updateError) {
        console.error("[consultation] update failed:", updateError.message);
        return NextResponse.json({ error: "Update failed." }, { status: 500 });
      }
    }

    // Batch-insert answers if provided
    if (answers && answers.length > 0) {
      const rows = answers.map((a: ConsultationAnswerPayload) => ({
        consultation_id: id,
        question_key: a.question_key,
        step_number: a.step_number ?? null,
        answer_text: a.answer_text ?? null,
        answer_number: a.answer_number ?? null,
        answer_boolean: a.answer_boolean ?? null,
        answer_json: a.answer_json ?? null,
      }));

      const { error: answersError } = await admin
        .from("consultation_answers")
        .insert(rows);

      if (answersError) {
        // Non-fatal: answers are supplementary
        console.error("[consultation] answers insert failed:", answersError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[consultation] patch unexpected:", msg);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
