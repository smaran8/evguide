import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifySecurityEvent } from "@/lib/security/alerts";

export type AdminDepartment =
  | "management" | "sales" | "finance" | "technical"
  | "marketing"  | "support" | "operations";

export type AdminGuardResult =
  | { ok: true; userId: string; role: "admin" | "super_admin" }
  | { ok: false; response: NextResponse };

/**
 * Allows both 'admin' and 'super_admin' roles.
 * Use this for general admin route protection.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    await notifySecurityEvent({
      type: "admin-unauthorized",
      message: "Unauthorized admin route access attempt.",
    });
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;
  const isAdminOrAbove = role === "admin" || role === "super_admin";

  if (profileError || !isAdminOrAbove) {
    await notifySecurityEvent({
      type: "admin-forbidden",
      message: "Non-admin user attempted to access an admin-only route.",
      details: { userId: user.id, role: role ?? "none" },
    });
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, role: role as "admin" | "super_admin" };
}

/**
 * Only allows 'super_admin'.
 * Use this for role management and other privileged operations.
 */
export async function requireSuperAdmin(): Promise<AdminGuardResult> {
  const result = await requireAdmin();
  if (!result.ok) return result;

  if (result.role !== "super_admin") {
    await notifySecurityEvent({
      type: "admin-forbidden",
      message: "Admin (non-super) attempted a super_admin-only action.",
      details: { userId: result.userId },
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only super admins can perform this action." },
        { status: 403 },
      ),
    };
  }

  return result;
}

/**
 * Allows super_admin unconditionally.
 * Allows admin only if their department is in the `allowed` list.
 * management department admins are treated as having full data access.
 */
export async function requireAdminForDepartments(
  allowed: AdminDepartment[],
): Promise<AdminGuardResult> {
  const result = await requireAdmin();
  if (!result.ok) return result;

  // super_admin bypasses all department restrictions
  if (result.role === "super_admin") return result;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("department")
    .eq("id", result.userId)
    .single();

  const dept = profile?.department as AdminDepartment | null;

  // management has full data access across departments
  if (dept === "management") return result;

  if (!dept || !allowed.includes(dept)) {
    await notifySecurityEvent({
      type: "admin-forbidden",
      message: "Admin attempted to access a section outside their department.",
      details: { userId: result.userId, department: dept ?? "none", required: allowed },
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You do not have access to this section." },
        { status: 403 },
      ),
    };
  }

  return result;
}
