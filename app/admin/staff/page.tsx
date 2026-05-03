import { redirect }            from "next/navigation";
import { createAdminClient }    from "@/lib/supabase/admin";
import { createClient }         from "@/lib/supabase/server";
import StaffPanel, { type StaffMember, type Department } from "@/components/admin/StaffPanel";

export const metadata = {
  title: "Staff & Access | EV Guide Admin",
  description: "Manage staff members, departments, and admin access.",
};

export const dynamic = "force-dynamic";

async function getData() {
  const admin = createAdminClient();

  // All auth users
  const { data: authData, error: authError } = await admin.auth.admin.listUsers();
  if (authError) throw new Error(authError.message);

  // All profiles (role + department + job_title)
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, department, job_title, full_name");

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        role:       (p.role as string) ?? "user",
        department: (p.department as Department | null) ?? null,
        job_title:  (p.job_title as string | null) ?? null,
        full_name:  (p.full_name as string | null) ?? null,
      },
    ]),
  );

  const all: StaffMember[] = authData.users.map((u) => {
    const profile = profileMap.get(u.id);
    const authName = typeof u.user_metadata?.full_name === "string"
      ? u.user_metadata.full_name
      : null;
    return {
      id:         u.id,
      name:       profile?.full_name ?? authName,
      email:      u.email ?? "-",
      role:       profile?.role ?? "user",
      department: profile?.department ?? null,
      job_title:  profile?.job_title  ?? null,
      joined:     u.created_at,
    };
  });

  const staff        = all.filter((u) => u.role === "admin" || u.role === "super_admin");
  const regularUsers = all.filter((u) => u.role === "user");

  return { staff, regularUsers };
}

async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return { id: data.user.id, role: (profile?.role as string) ?? "user" };
}

export default async function StaffPage() {
  const [current, { staff, regularUsers }] = await Promise.all([
    getCurrentUser(),
    getData(),
  ]);

  if (!current) redirect("/admin-login");

  const isSuperAdmin = current.role === "super_admin";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Access Control</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Staff & Access</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Manage your admin team, assign departments, and control who has access to the admin panel.
          Only the super admin can promote, demote, or reassign staff.
        </p>
      </div>

      <StaffPanel
        staff={staff}
        regularUsers={regularUsers}
        currentId={current.id}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
