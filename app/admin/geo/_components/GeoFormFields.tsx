import { REGION_TYPES } from "@/lib/geo";
import type { GeoRegion } from "@/lib/geo";

type Props = {
  defaultValues?: Partial<GeoRegion>;
};

export function GeoFormFields({ defaultValues }: Props) {
  return (
    <>
      {/* Identity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Region Identity</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="col-span-2 block">
            <span className="text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              required
              name="name"
              type="text"
              placeholder="Greater London"
              defaultValue={defaultValues?.name ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Slug <span className="text-red-500">*</span>
            </span>
            <input
              required
              name="slug"
              type="text"
              placeholder="greater-london"
              defaultValue={defaultValues?.slug ?? ""}
              pattern="[a-z0-9-]+"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Lowercase, hyphens only</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Type <span className="text-red-500">*</span>
            </span>
            <select
              required
              name="region_type"
              defaultValue={defaultValues?.region_type ?? "city"}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {REGION_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Country Code</span>
            <input
              name="country"
              type="text"
              maxLength={2}
              placeholder="GB"
              defaultValue={defaultValues?.country ?? "GB"}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Sort Order</span>
            <input
              name="sort_order"
              type="number"
              min={0}
              placeholder="0"
              defaultValue={defaultValues?.sort_order ?? 0}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            name="description"
            rows={2}
            placeholder="Optional description for this region…"
            defaultValue={defaultValues?.description ?? ""}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={defaultValues?.is_active ?? true}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Active</span>
        </label>
      </div>

      {/* Coordinates */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Coordinates</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Latitude</span>
            <input
              name="lat"
              type="number"
              step="0.000001"
              min={-90}
              max={90}
              placeholder="51.5074"
              defaultValue={defaultValues?.lat ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Longitude</span>
            <input
              name="lng"
              type="number"
              step="0.000001"
              min={-180}
              max={180}
              placeholder="-0.1278"
              defaultValue={defaultValues?.lng ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Used for map display and distance calculations. You can look up coordinates on{" "}
          <a
            href="https://www.latlong.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            latlong.net
          </a>
          .
        </p>
      </div>
    </>
  );
}
