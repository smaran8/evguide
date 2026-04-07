import Link from "next/link";
import { getAllGeoRegions } from "@/lib/geo";
import AdminGeoDeleteButton from "../../../components/AdminGeoDeleteButton";

const typeColors: Record<string, string> = {
  city:    "bg-blue-50 text-blue-700",
  county:  "bg-purple-50 text-purple-700",
  region:  "bg-amber-50 text-amber-700",
  country: "bg-green-50 text-green-700",
};

export default async function AdminGeoPage() {
  const regions = await getAllGeoRegions();

  const byType = regions.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.region_type]: (acc[r.region_type] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">GEO Management</h1>
          <p className="mt-1 text-slate-500">
            {regions.length} region{regions.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Link
          href="/admin/geo/new"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Region
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        {(["city", "county", "region", "country"] as const).map((t) => (
          <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{byType[t] ?? 0}</p>
            <p className="mt-0.5 text-sm capitalize text-slate-500">{t === "city" ? "Cities" : t === "county" ? "Counties" : t === "region" ? "Regions" : "Countries"}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {regions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <p className="text-slate-500">No geographic regions configured yet.</p>
            <Link
              href="/admin/geo/new"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add your first region
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600">Order</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Name</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Slug</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Type</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Country</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Coordinates</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr
                    key={region.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-center text-slate-500">{region.sort_order}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{region.name}</td>
                    <td className="px-6 py-4">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                        {region.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColors[region.region_type] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {region.region_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{region.country}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {region.lat != null && region.lng != null
                        ? `${region.lat}, ${region.lng}`
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          region.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {region.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/geo/${region.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                        <AdminGeoDeleteButton id={region.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-5">
        <h2 className="text-sm font-semibold text-green-900">How GEO regions work</h2>
        <p className="mt-1 text-sm text-green-700">
          Geographic regions are used for dealer targeting, location-based EV availability, and
          personalised landing pages. Each region has a unique slug used in URLs like
          <code className="mx-1 rounded bg-green-100 px-1 font-mono text-xs">/evs/greater-london</code>.
          Coordinates are used for distance calculations and map pins.
        </p>
      </div>
    </div>
  );
}
