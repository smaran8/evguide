"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavLink = { href: string; label: string; exact?: boolean };
type NavSection = "general" | "content" | "vehicles" | "finance" | "platform";

// ── Nav sections ──────────────────────────────────────────────────────────────

const SECTION_META: Record<NavSection, { label: string }> = {
  general:  { label: "General" },
  content:  { label: "Content" },
  vehicles: { label: "Vehicles & CRM" },
  finance:  { label: "Finance" },
  platform: { label: "Platform" },
};

const SECTION_LINKS: Record<NavSection, NavLink[]> = {
  general: [
    { href: "/admin",       label: "Dashboard",   exact: true },
    { href: "/admin/audit", label: "System Audit" },
  ],
  content: [
    { href: "/admin/evs",              label: "EV Models" },
    { href: "/admin/evs/new",          label: "Add New EV" },
    { href: "/admin/blog",             label: "Blog Posts" },
    { href: "/admin/feedback",         label: "Feedback Moderation" },
    { href: "/admin/seo",              label: "SEO Management" },
    { href: "/admin/seo/keywords",     label: "SEO Keywords" },
    { href: "/admin/geo",              label: "GEO Regions" },
  ],
  vehicles: [
    { href: "/admin/leads",            label: "Lead Pipeline" },
    { href: "/admin/pipeline",         label: "Pipeline Board" },
    { href: "/admin/recommendations",  label: "AI Recommendations" },
    { href: "/admin/consultations",    label: "Consultations" },
    { href: "/admin/crm",              label: "CRM Journey" },
    { href: "/admin/vehicle-queries",  label: "Vehicle Queries" },
    { href: "/admin/exchange",         label: "Exchange Requests" },
  ],
  finance: [
    { href: "/admin/finance-requests", label: "Finance Requests" },
  ],
  platform: [
    { href: "/admin/staff", label: "Staff & Access" },
    { href: "/admin/users", label: "Users & Access" },
  ],
};

// ── Department → visible sections ─────────────────────────────────────────────

function getVisibleSections(role: string, department: string | null): NavSection[] {
  if (role === "super_admin") {
    return ["general", "content", "vehicles", "finance", "platform"];
  }
  // management admins get full data access (but not platform/staff management)
  if (department === "management") {
    return ["general", "content", "vehicles", "finance"];
  }
  switch (department) {
    case "sales":
    case "support":
      return ["general", "vehicles"];
    case "operations":
      return ["general", "vehicles", "finance"];
    case "finance":
      return ["general", "finance"];
    case "technical":
    case "marketing":
      return ["general", "content"];
    default:
      // unassigned or pre-migration — full data access until a department is assigned
      return ["general", "content", "vehicles", "finance"];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  role:       string;
  department: string | null;
}

export default function AdminSidebar({ role, department }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin-login");
    router.refresh();
  }

  const visibleSections = getVisibleSections(role, department);
  const isSuperAdmin = role === "super_admin";

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white px-4 py-8">
      <div className="mb-8 px-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {isSuperAdmin ? "Super Admin" : "Admin Panel"}
        </p>
        <p className="mt-1 text-lg font-bold text-slate-900">EV Guide</p>
        {!isSuperAdmin && department && (
          <p className="mt-0.5 text-xs capitalize text-slate-400">{department}</p>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {visibleSections.map((sectionKey) => {
          const links = SECTION_LINKS[sectionKey];
          const meta  = SECTION_META[sectionKey];
          return (
            <div key={sectionKey}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {meta.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {links.map(({ href, label, exact }) => {
                  const active = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-4">
        <Link
          href="/"
          className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          View Site
        </Link>
        <button
          onClick={handleSignOut}
          className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
