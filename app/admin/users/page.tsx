import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AdminRoleToggle from "@/components/AdminRoleToggle";

export const metadata = {
  title: "Users & Access | EV Guide Admin",
};

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  role: string;
};

async function getUsers() {
  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw new Error(authError.message);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role");

  const roleMap = new Map((profiles ?? []).map((p) => [p.id, p.role as string]));

  return authData.users.map((user) => ({
    id:         user.id,
    name:       typeof user.user_metadata?.full_name === "string"
                  ? user.user_metadata.full_name
                  : null,
    email:      user.email ?? "-",
    created_at: user.created_at,
    role:       roleMap.get(user.id) ?? "user",
  }));
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

  return {
    id:   data.user.id,
    role: (profile?.role as string) ?? "user",
  };
}

function formatUserDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") {
    return (
      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
        Super Admin
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
        Admin
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      User
    </span>
  );
}

function StaticUserTable({
  rows,
  emptyText,
  currentUserId,
  isSuperAdmin,
}: {
  rows: UserRow[];
  emptyText: string;
  currentUserId: string;
  isSuperAdmin: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {rows.length === 0 ? (
        <p className="px-6 py-8 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-6 py-3 font-semibold text-slate-600">Name</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Email</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Joined</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Role</th>
              <th className="px-6 py-3 font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-6 py-4 font-medium text-slate-900">
                  {user.name ?? <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="px-6 py-4 text-slate-700">{user.email}</td>
                <td className="px-6 py-4 text-slate-500">{formatUserDate(user.created_at)}</td>
                <td className="px-6 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4 text-right">
                  <AdminRoleToggle
                    userId={user.id}
                    currentRole={user.role}
                    isSelf={user.id === currentUserId}
                    canManage={isSuperAdmin}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function AdminUsersPage() {
  const [users, currentUser] = await Promise.all([getUsers(), getCurrentUser()]);

  if (!currentUser) redirect("/admin-login");

  const currentUserId  = currentUser.id;
  const isSuperAdmin   = currentUser.role === "super_admin";

  const superAdmins  = users.filter((u) => u.role === "super_admin");
  const admins       = users.filter((u) => u.role === "admin");
  const regularUsers = users.filter((u) => u.role !== "admin" && u.role !== "super_admin");

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  function UserTable({
    rows,
    emptyText,
  }: {
    rows: typeof users;
    emptyText: string;
  }) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">{emptyText}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-6 py-3 font-semibold text-slate-600">Name</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Email</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Joined</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Role</th>
                <th className="px-6 py-3 font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {user.name ?? <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{user.email}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <AdminRoleToggle
                      userId={user.id}
                      currentRole={user.role}
                      isSelf={user.id === currentUserId}
                      canManage={isSuperAdmin}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  void UserTable;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Users & Access</h1>
        <p className="mt-1 text-slate-500">
          {users.length} total —{" "}
          {superAdmins.length} super admin,{" "}
          {admins.length} admin{admins.length !== 1 ? "s" : ""},{" "}
          {regularUsers.length} regular user{regularUsers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Permission notice for non-super admins */}
      {!isSuperAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <strong>View only.</strong> Only the super admin can assign or revoke roles.
        </div>
      )}

      {/* Super admins */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Super Admin
        </h2>
        <StaticUserTable
          rows={superAdmins}
          emptyText="No super admins configured."
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
        />
      </section>

      {/* Admins */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Admins
          </h2>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {admins.length}
          </span>
        </div>
        <StaticUserTable
          rows={admins}
          emptyText="No admins yet."
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
        />
      </section>

      {/* Regular users */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Users
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {regularUsers.length}
          </span>
        </div>
        <StaticUserTable
          rows={regularUsers}
          emptyText="No regular users yet."
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
        />
        {isSuperAdmin && regularUsers.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Click <strong>Make Admin</strong> on any user to grant them admin access.
          </p>
        )}
      </section>
    </div>
  );
}
