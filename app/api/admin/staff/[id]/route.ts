/**
 * PATCH /api/admin/staff/:id
 * Update department, job_title, and full_name for a staff member.
 * Requires super_admin role.
 */

import { NextResponse }         from "next/server";
import { createAdminClient }    from "@/lib/supabase/admin";
import { requireSuperAdmin }    from "@/lib/security/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_DEPARTMENTS = [
  "management", "sales", "finance", "technical", "marketing", "support", "operations",
] as const;

type Department = (typeof VALID_DEPARTMENTS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  let body: { department?: string | null; job_title?: string | null; full_name?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { department, job_title, full_name } = body;

  if (department !== undefined && department !== null && !VALID_DEPARTMENTS.includes(department as Department)) {
    return NextResponse.json(
      { error: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(", ")}.` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Confirm target exists and is not a regular user
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (department !== undefined) updatePayload.department = department;
  if (job_title   !== undefined) updatePayload.job_title  = job_title;
  if (full_name   !== undefined) updatePayload.full_name  = full_name;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
