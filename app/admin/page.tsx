import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getStats() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [
    { count: totalEVs },
    { data: brandRows },
    { data: recentEVs },
    { count: totalBlogPosts },
    { count: publishedBlogPosts },
    { count: totalFeedback },
    { count: approvedFeedback },
    { count: totalConsultations },
    { count: pendingConsultations },
    { count: contactedConsultations },
    { count: resolvedConsultations },
    { count: totalVehicleQueries },
    { count: newVehicleQueries },
    { count: totalSeoPages },
    { count: activeSeoPages },
    { count: totalGeoRegions },
    { count: activeGeoRegions },
  ] = await Promise.all([
    supabase.from("ev_models").select("*", { count: "exact", head: true }),
    supabase.from("ev_models").select("brand"),
    supabase
      .from("ev_models")
      .select("id, brand, model, price, range_km")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("published", true),
    supabase.from("user_ev_feedback").select("*", { count: "exact", head: true }),
    supabase
      .from("user_ev_feedback")
      .select("*", { count: "exact", head: true })
      .eq("is_approved", true),
    supabase.from("consultation_requests").select("*", { count: "exact", head: true }),
    supabase
      .from("consultation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("consultation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "contacted"),
    supabase
      .from("consultation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved"),
    supabase.from("vehicle_queries").select("*", { count: "exact", head: true }),
    supabase.from("vehicle_queries").select("*", { count: "exact", head: true }).eq("status", "new"),
    adminClient.from("seo_pages").select("*", { count: "exact", head: true }),
    adminClient.from("seo_pages").select("*", { count: "exact", head: true }).eq("is_active", true),
    adminClient.from("geo_regions").select("*", { count: "exact", head: true }),
    adminClient.from("geo_regions").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    totalEVs: totalEVs ?? 0,
    uniqueBrands: new Set(brandRows?.map((row) => row.brand) ?? []).size,
    recentEVs: recentEVs ?? [],
    totalBlogPosts: totalBlogPosts ?? 0,
    publishedBlogPosts: publishedBlogPosts ?? 0,
    totalFeedback: totalFeedback ?? 0,
    approvedFeedback: approvedFeedback ?? 0,
    totalConsultations: totalConsultations ?? 0,
    pendingConsultations: pendingConsultations ?? 0,
    contactedConsultations: contactedConsultations ?? 0,
    resolvedConsultations: resolvedConsultations ?? 0,
    totalVehicleQueries: totalVehicleQueries ?? 0,
    newVehicleQueries: newVehicleQueries ?? 0,
    totalSeoPages: totalSeoPages ?? 0,
    activeSeoPages: activeSeoPages ?? 0,
    totalGeoRegions: totalGeoRegions ?? 0,
    activeGeoRegions: activeGeoRegions ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const {
    totalEVs,
    uniqueBrands,
    recentEVs,
    totalBlogPosts,
    publishedBlogPosts,
    totalFeedback,
    approvedFeedback,
    totalConsultations,
    pendingConsultations,
    contactedConsultations,
    resolvedConsultations,
    totalVehicleQueries,
    newVehicleQueries,
    totalSeoPages,
    activeSeoPages,
    totalGeoRegions,
    activeGeoRegions,
  } = await getStats();

  const draftBlogPosts = Math.max(totalBlogPosts - publishedBlogPosts, 0);
  const pendingFeedback = Math.max(totalFeedback - approvedFeedback, 0);
  const activeConsultations = pendingConsultations + contactedConsultations;

  const moduleCards = [
    {
      title: "EV Models",
      total: totalEVs,
      detailA: `${uniqueBrands} brands`,
      detailB: `${recentEVs.length} recent listed`,
      href: "/admin/evs",
      actionLabel: "Manage EVs",
      tone: "border-blue-200 bg-blue-50 text-blue-900",
    },
    {
      title: "Blog Posts",
      total: totalBlogPosts,
      detailA: `${publishedBlogPosts} published`,
      detailB: `${draftBlogPosts} drafts`,
      href: "/admin/blog",
      actionLabel: "Manage Blog",
      tone: "border-indigo-200 bg-indigo-50 text-indigo-900",
    },
    {
      title: "Feedback",
      total: totalFeedback,
      detailA: `${approvedFeedback} approved`,
      detailB: `${pendingFeedback} pending`,
      href: "/admin/feedback",
      actionLabel: "Moderate Feedback",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    {
      title: "Consultations",
      total: totalConsultations,
      detailA: `${resolvedConsultations} resolved`,
      detailB: `${activeConsultations} active`,
      href: "/admin/consultations",
      actionLabel: "Manage Consultations",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      title: "Vehicle Queries",
      total: totalVehicleQueries,
      detailA: `${newVehicleQueries} new enquiries`,
      detailB: `${totalVehicleQueries - newVehicleQueries} actioned`,
      href: "/admin/vehicle-queries",
      actionLabel: "View Queries",
      tone: "border-violet-200 bg-violet-50 text-violet-900",
    },
    {
      title: "SEO Pages",
      total: totalSeoPages,
      detailA: `${activeSeoPages} active`,
      detailB: `${totalSeoPages - activeSeoPages} inactive`,
      href: "/admin/seo",
      actionLabel: "Manage SEO",
      tone: "border-rose-200 bg-rose-50 text-rose-900",
    },
    {
      title: "GEO Regions",
      total: totalGeoRegions,
      detailA: `${activeGeoRegions} active`,
      detailB: `${totalGeoRegions - activeGeoRegions} inactive`,
      href: "/admin/geo",
      actionLabel: "Manage GEO",
      tone: "border-teal-200 bg-teal-50 text-teal-900",
    },
  ];

  const taskReport = [
    {
      task: "EV Models Management",
      done: totalEVs,
      pending: 0,
      note: "Total vehicle records available",
    },
    {
      task: "Blog Publishing",
      done: publishedBlogPosts,
      pending: draftBlogPosts,
      note: "Published vs draft posts",
    },
    {
      task: "Feedback Moderation",
      done: approvedFeedback,
      pending: pendingFeedback,
      note: "Approved vs waiting feedback",
    },
    {
      task: "Consultation Handling",
      done: resolvedConsultations,
      pending: activeConsultations,
      note: "Resolved vs pending/contacted",
    },
    {
      task: "Vehicle Query Leads",
      done: totalVehicleQueries - newVehicleQueries,
      pending: newVehicleQueries,
      note: "Actioned vs new from Find My EV",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-500">Overview of your EV Guide database.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {moduleCards.map((card) => (
          <div key={card.title} className={`rounded-2xl border p-6 shadow-sm ${card.tone}`}>
            <p className="text-sm font-semibold">{card.title}</p>
            <p className="mt-3 text-4xl font-bold">{card.total}</p>
            <p className="mt-3 text-sm opacity-90">{card.detailA}</p>
            <p className="text-sm opacity-90">{card.detailB}</p>
            <Link
              href={card.href}
              className="mt-5 inline-flex rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              {card.actionLabel}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Task Completion Report</h2>
          <p className="mt-1 text-sm text-slate-500">
            Done vs pending status for each admin task area.
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-6 py-3 font-semibold text-slate-600">Task Area</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Done</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Pending</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Report</th>
            </tr>
          </thead>
          <tbody>
            {taskReport.map((item) => (
              <tr key={item.task} className="border-b border-slate-100 last:border-b-0">
                <td className="px-6 py-4 font-medium text-slate-900">{item.task}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {item.done}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {item.pending}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/evs/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Add New EV
        </Link>
        <Link
          href="/admin/blog/new"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Create Blog Post
        </Link>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Recently Added</h2>
          <Link href="/admin/evs" className="text-sm font-medium text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {recentEVs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-slate-500">No EV models in the database yet.</p>
            <Link
              href="/admin/evs/new"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add your first EV
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600">Brand</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Model</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Price</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Range</th>
                  <th className="px-6 py-3 font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {recentEVs.map((ev) => (
                  <tr key={ev.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{ev.brand}</td>
                    <td className="px-6 py-4 text-slate-700">{ev.model}</td>
                    <td className="px-6 py-4 text-slate-700">GBP {ev.price?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-700">{ev.range_km} km</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/evs/${ev.id}`} className="text-blue-600 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
