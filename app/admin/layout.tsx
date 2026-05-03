export const dynamic = "force-dynamic";

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin-login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;
  if (error || (role !== "admin" && role !== "super_admin")) {
    redirect("/");
  }

  // department column is added via manual migration — graceful fallback if not yet applied
  const { data: deptData } = await supabase
    .from("profiles")
    .select("department")
    .eq("id", user.id)
    .single();
  const department = (deptData?.department as string | null) ?? null;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar role={role!} department={department} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
