import { notFound } from "next/navigation";
import Link from "next/link";
import { getGeoRegionById } from "@/lib/geo";
import { updateGeoRegionAction } from "../actions";
import { GeoFormFields } from "../_components/GeoFormFields";

type Props = { params: Promise<{ id: string }> };

export default async function AdminGeoEditPage({ params }: Props) {
  const { id } = await params;
  const region = await getGeoRegionById(id);
  if (!region) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateGeoRegionAction(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Edit GEO Region</h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{region.name}</p>
      </div>

      <form action={action} className="space-y-6">
        <GeoFormFields defaultValues={region} />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save Changes
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
