import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/security/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Only super admins can change roles
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { role } = await request.json();

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'user'." },
        { status: 400 },
      );
    }

    // Prevent demoting super_admin via this endpoint
    const supabase = createAdminClient();
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();

    if (target?.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot change the role of a super admin." },
        { status: 403 },
      );
    }

    // Prevent super admin from demoting themselves
    if (id === auth.userId) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Profile not found for this user." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, id, role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
