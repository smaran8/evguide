"use client";

import { deleteKeywordAction } from "./actions";

export default function DeleteKeywordButton({ id }: { id: string }) {
  return (
    <button
      onClick={() => {
        if (confirm("Delete this keyword?")) {
          void deleteKeywordAction(id);
        }
      }}
      className="text-sm font-medium text-red-500 hover:text-red-700"
    >
      Delete
    </button>
  );
}
