import { createSeoPage } from "../actions";
import Link from "next/link";
import { SeoFormFields } from "@/components/seo/SeoFormFields";

export default function AdminSeoNewPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">New SEO Page</h1>
        <p className="mt-1 text-slate-500">Add metadata for a new route</p>
      </div>

      <form action={createSeoPage} className="space-y-6">
        <SeoFormFields />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save Page
          </button>
          <Link
            href="/admin/seo"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
