type SeoFormFieldValues = {
  page_slug?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  canonical_url?: string | null;
  keywords?: string[] | null;
  is_active?: boolean;
};

export function SeoFormFields({
  defaultValues,
}: {
  defaultValues?: SeoFormFieldValues;
}) {
  return (
    <>
      {/* Slug */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Page Route</h2>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Page Slug <span className="text-red-500">*</span>
          </span>
          <input
            required
            name="page_slug"
            type="text"
            placeholder="/vehicles"
            defaultValue={defaultValues?.page_slug ?? ""}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Must start with /. E.g. /, /vehicles, /cars/tesla-model-3
          </p>
        </label>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={defaultValues?.is_active ?? true}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Active (used in production)</span>
        </label>
      </div>

      {/* Meta tags */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Meta Tags</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Meta Title</span>
            <input
              name="meta_title"
              type="text"
              maxLength={70}
              placeholder="EV Guide UK — Find Your Perfect Electric Vehicle"
              defaultValue={defaultValues?.meta_title ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Recommended: 50–60 characters</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Meta Description</span>
            <textarea
              name="meta_description"
              rows={3}
              maxLength={160}
              placeholder="Browse, compare and finance EVs in the UK."
              defaultValue={defaultValues?.meta_description ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Recommended: 120–160 characters</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Keywords</span>
            <input
              name="keywords"
              type="text"
              placeholder="electric vehicles, EV guide, UK electric cars"
              defaultValue={defaultValues?.keywords?.join(", ") ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Comma-separated list</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Canonical URL</span>
            <input
              name="canonical_url"
              type="url"
              placeholder="https://evguide.co.uk/vehicles"
              defaultValue={defaultValues?.canonical_url ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Open Graph */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Open Graph (Social)</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">OG Title</span>
            <input
              name="og_title"
              type="text"
              maxLength={95}
              placeholder="EV Guide UK"
              defaultValue={defaultValues?.og_title ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">OG Description</span>
            <textarea
              name="og_description"
              rows={2}
              maxLength={200}
              placeholder="Your complete guide to buying an EV in the UK."
              defaultValue={defaultValues?.og_description ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">OG Image URL</span>
            <input
              name="og_image"
              type="url"
              placeholder="https://evguide.co.uk/og-image.jpg"
              defaultValue={defaultValues?.og_image ?? ""}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Recommended: 1200×630 px</p>
          </label>
        </div>
      </div>
    </>
  );
}
