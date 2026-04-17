import { notFound } from "next/navigation";
import Link from "next/link";
import { getKeywordById } from "@/lib/seo-keywords";
import { updateKeywordAction } from "../actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditKeywordPage({ params }: Props) {
  const { id } = await params;
  const kw = await getKeywordById(id);
  if (!kw) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateKeywordAction(id, formData);
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Edit Keyword</h1>
        <p className="mt-1 text-sm text-slate-500 font-mono">{kw.keyword}</p>
      </div>

      <form action={action} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Keyword *</span>
            <input
              required
              name="keyword"
              type="text"
              defaultValue={kw.keyword}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Search Volume</span>
              <input
                name="search_volume"
                type="number"
                min={0}
                defaultValue={kw.search_volume}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Trend Score (0–100)</span>
              <input
                name="trend_score"
                type="number"
                min={0}
                max={100}
                step={0.1}
                defaultValue={kw.trend_score}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Intent</span>
            <select
              name="intent"
              defaultValue={kw.intent}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="informational">Informational</option>
              <option value="commercial">Commercial</option>
              <option value="transactional">Transactional</option>
              <option value="navigational">Navigational</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Target Page</span>
            <input
              name="target_page"
              type="text"
              defaultValue={kw.target_page}
              placeholder="/vehicles"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave blank to auto-detect from keyword text.
            </p>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={kw.is_active}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
          <Link
            href="/admin/seo/keywords"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
