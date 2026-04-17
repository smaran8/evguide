"use client";

import { useState } from "react";
import { triggerSyncAction } from "./actions";

export default function SyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [result, setResult] = useState<{ pagesUpdated: number; slugsUpdated: string[] } | null>(null);

  async function handleSync() {
    setState("syncing");
    try {
      const res = await triggerSyncAction();
      setResult(res);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={state === "syncing"}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {state === "syncing" ? "Syncing…" : "Sync to Pages"}
      </button>

      {state === "done" && result && (
        <p className="text-xs text-emerald-700">
          Updated {result.pagesUpdated} page{result.pagesUpdated !== 1 ? "s" : ""}:{" "}
          {result.slugsUpdated.join(", ")}
        </p>
      )}
      {state === "error" && (
        <p className="text-xs text-red-600">Sync failed. Check server logs.</p>
      )}
    </div>
  );
}
