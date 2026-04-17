"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/admin",                    label: "Dashboard",            exact: true },
  { href: "/admin/audit",              label: "System Audit" },
  // ── Content ───────────────────────────────────────
  { href: "/admin/evs",                label: "EV Models" },
  { href: "/admin/evs/new",            label: "Add New EV" },
  { href: "/admin/blog",               label: "Blog Posts" },
  { href: "/admin/feedback",           label: "Feedback Moderation" },
  // ── Leads & CRM ───────────────────────────────────
  { href: "/admin/leads",              label: "Lead Pipeline" },
  { href: "/admin/pipeline",           label: "Pipeline Board" },
  { href: "/admin/recommendations",    label: "AI Recommendations" },
  { href: "/admin/finance-requests",   label: "Finance Requests" },
  { href: "/admin/consultations",      label: "Consultations" },
  { href: "/admin/crm",                label: "CRM Journey" },
  // ── Enquiries ─────────────────────────────────────
  { href: "/admin/vehicle-queries",    label: "Vehicle Queries" },
  { href: "/admin/exchange",           label: "Exchange Requests" },
  // ── Platform ──────────────────────────────────────
  { href: "/admin/users",              label: "Users & Access" },
  { href: "/admin/seo",                label: "SEO Management" },
  { href: "/admin/seo/keywords",       label: "SEO Keywords" },
  { href: "/admin/geo",                label: "GEO Regions" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin-login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white px-4 py-8">
      <div className="mb-8 px-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Admin Panel</p>
        <p className="mt-1 text-lg font-bold text-slate-900">EV Guide</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navLinks.map(({ href, label, exact }) => {
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
