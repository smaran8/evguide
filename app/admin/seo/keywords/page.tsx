import Link from "next/link";
import { getAllKeywords } from "@/lib/seo-keywords";
import SyncButton from "./SyncButton";
import DeleteKeywordButton from "./DeleteKeywordButton";
import { createKeywordAction } from "./actions";

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-50 text-blue-700",
  commercial: "bg-violet-50 text-violet-700",
  transactional: "bg-emerald-50 text-emerald-700",
  navigational: "bg-slate-100 text-slate-600",
};

function TrendBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-500">{pct.toFixed(0)}</span>
    </div>
  );
}

export default async function AdminSeoKeywordsPage() {
  const keywords = await getAllKeywords();

  const highTrend = keywords.filter((k) => k.trend_score >= 80).length;
  const overridden = keywords.filter((k) => k.is_overridden).length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SEO Keywords</h1>
          <p className="mt-1 text-slate-500">
            {keywords.length} keywords · {highTrend} trending · {overridden} manually overridden
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncButton />
        </div>
      </div>

      {/* Back to SEO pages */}
      <div className="mt-2">
        <Link href="/admin/seo" className="text-sm text-blue-600 hover:underline">
          ← Back to SEO Pages
        </Link>
      </div>

      {/* Add keyword form */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Add Keyword</h2>
        <form action={createKeywordAction} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <input
            required
            name="keyword"
            type="text"
            placeholder="Keyword *"
            className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none lg:col-span-2"
          />
          <input
            name="search_volume"
            type="number"
            min={0}
            placeholder="Search volume"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <input
            name="trend_score"
            type="number"
            min={0}
            max={100}
            step={0.1}
            placeholder="Trend score"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <select
            name="intent"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="informational">Informational</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
            <option value="navigational">Navigational</option>
          </select>
          <input
            name="target_page"
            type="text"
            placeholder="Target page (auto)"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />

          <div className="col-span-full flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Active
            </label>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add Keyword
            </button>
          </div>
        </form>
      </div>

      {/* Keyword table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {keywords.length === 0 ? (
          <div className="py-20 text-center text-slate-500">No keywords yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600">Keyword</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Intent</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Target Page</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Search Vol.</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Trend</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <tr key={kw.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{kw.keyword}</span>
                      {kw.is_overridden && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        INTENT_COLORS[kw.intent] ?? "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {kw.intent}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                      {kw.target_page}
                    </code>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-slate-600">
                    {kw.search_volume.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <TrendBar score={kw.trend_score} />
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        kw.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {kw.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/seo/keywords/${kw.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                      <DeleteKeywordButton id={kw.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info callout */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h2 className="text-sm font-semibold text-blue-900">How auto-sync works</h2>
        <p className="mt-1 text-sm text-blue-700">
          Clicking <strong>Sync to Pages</strong> applies all keywords with trend score ≥ 70 to
          their target SEO pages. It merges the keyword list and regenerates FAQ content blocks.
          Keywords marked <strong>Locked</strong> have been manually edited and won&apos;t have their
          settings overwritten by future syncs — only their keywords are applied to pages.
        </p>
      </div>
    </div>
  );
}
