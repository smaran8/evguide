"use client";

import { useState } from "react";

export default function AdminSeedVehiclesButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);

  async function handleSeed() {
    if (!confirm("This will upsert all local EV model data into the database. Continue?")) return;
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-vehicles", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setResult(json.error ?? "Unknown error");
        setState("error");
      } else {
        setResult(`${json.upserted} of ${json.total} vehicles seeded successfully.`);
        setState("done");
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Network error");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSeed}
        disabled={state === "loading"}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {state === "loading" ? "Seeding…" : "Seed Local Data → DB"}
      </button>
      {result && (
        <span className={`text-sm font-medium ${state === "error" ? "text-red-600" : "text-emerald-700"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
