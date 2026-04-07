import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;

  return user;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { profileId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  if (noteBody.length < 2) {
    return NextResponse.json({ error: "Note is too short." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("crm_lead_notes").insert({
    profile_id: profileId,
    author_user_id: adminUser.id,
    body: noteBody,
  });

  if (error) {
    console.error("[crm] failed to insert crm_lead_notes:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
