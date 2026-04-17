"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  currentRole: string;
  isSelf: boolean;
  /** Only super_admin can manage roles */
  canManage: boolean;
}

export default function AdminRoleToggle({ userId, currentRole, isSelf, canManage }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isAdmin = currentRole === "admin";
  const isSuperAdmin = currentRole === "super_admin";
  const nextRole = isAdmin ? "user" : "admin";

  async function handleToggle() {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    setLoading(false);
    setConfirming(false);

    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json();
      alert(error ?? "Failed to update role.");
    }
  }

  // Super admin badge — never editable via this UI
  if (isSuperAdmin) {
    return (
      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
        Super Admin
      </span>
    );
  }

  // Self — show label, no controls
  if (isSelf) {
    return <span className="text-xs italic text-slate-400">You</span>;
  }

  // Not super admin viewing the page — read-only
  if (!canManage) {
    return null;
  }

  // Super admin: show confirm flow
  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          {loading ? "Saving…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-semibold text-slate-500 hover:underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
        isAdmin
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
      }`}
    >
      {isAdmin ? "Revoke Admin" : "Make Admin"}
    </button>
  );
}
