"use client";

import { useState } from "react";
import { deleteSeoPageAction } from "@/app/admin/seo/actions";

type Props = {
  id: string;
};

export default function AdminSeoDeleteButton({ id }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Delete?</span>
        <form action={deleteSeoPageAction.bind(null, id)}>
          <button
            type="submit"
            className="text-xs font-semibold text-red-600 hover:text-red-800"
          >
            Yes
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm font-medium text-red-500 hover:text-red-700"
    >
      Delete
    </button>
  );
}
