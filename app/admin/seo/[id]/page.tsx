import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeoPageById } from "@/lib/seo";
import { updateSeoPage } from "../actions";
import { SeoFormFields } from "@/components/seo/SeoFormFields";

type Props = { params: Promise<{ id: string }> };

export default async function AdminSeoEditPage({ params }: Props) {
  const { id } = await params;
  const page = await getSeoPageById(id);
  if (!page) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateSeoPage(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Edit SEO Page</h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{page.page_slug}</p>
      </div>

      <form action={action} className="space-y-6">
        <SeoFormFields defaultValues={page} />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save Changes
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
