import AdminEVForm from "@/components/AdminEVForm";

export default function NewEVPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-semibold text-blue-600">Admin Panel</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Add New EV
        </h1>
        <p className="mt-4 text-slate-600">
          Add a new EV model to your Supabase database.
        </p>

        <div className="mt-10">
          <AdminEVForm />
        </div>
      </div>
    </main>
  );
}