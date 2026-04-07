import { createGeoRegionAction } from "../actions";
import { GeoFormFields } from "../_components/GeoFormFields";
import Link from "next/link";

export default function AdminGeoNewPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">New GEO Region</h1>
        <p className="mt-1 text-slate-500">Add a geographic region for targeting and routing</p>
      </div>

      <form action={createGeoRegionAction} className="space-y-6">
        <GeoFormFields />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save Region
          </button>
          <Link
            href="/admin/geo"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
