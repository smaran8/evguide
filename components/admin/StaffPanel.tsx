"use client";

import { useState, useTransition } from "react";
import { useRouter }                from "next/navigation";
import { X, Pencil, UserPlus, ShieldCheck, ShieldOff, Building2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Department =
  | "management" | "sales" | "finance" | "technical"
  | "marketing"  | "support" | "operations";

export interface StaffMember {
  id:         string;
  name:       string | null;
  email:      string;
  role:       string;
  department: Department | null;
  job_title:  string | null;
  joined:     string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const DEPARTMENTS: { value: Department; label: string; color: string }[] = [
  { value: "management",  label: "Management",  color: "bg-violet-100 text-violet-700" },
  { value: "sales",       label: "Sales",       color: "bg-emerald-100 text-emerald-700" },
  { value: "finance",     label: "Finance",     color: "bg-blue-100 text-blue-700" },
  { value: "technical",   label: "Technical",   color: "bg-orange-100 text-orange-700" },
  { value: "marketing",   label: "Marketing",   color: "bg-pink-100 text-pink-700" },
  { value: "support",     label: "Support",     color: "bg-amber-100 text-amber-700" },
  { value: "operations",  label: "Operations",  color: "bg-slate-100 text-slate-700" },
];

function deptMeta(d: Department | null) {
  return DEPARTMENTS.find((x) => x.value === d) ?? { label: "Unassigned", color: "bg-slate-100 text-slate-400" };
}

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",    "bg-emerald-500", "bg-violet-500",
  "bg-rose-500",    "bg-amber-500",   "bg-cyan-500",
  "bg-indigo-500",  "bg-teal-500",
];

function avatarColor(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length]!;
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditStaffModal({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name,       setName]       = useState(member.name ?? "");
  const [dept,       setDept]       = useState<Department | "">(member.department ?? "");
  const [jobTitle,   setJobTitle]   = useState(member.job_title ?? "");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name:  name.trim()     || null,
          department: dept            || null,
          job_title:  jobTitle.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save.");
        return;
      }
      onSaved();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Staff Profile</p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">Edit Member</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 px-6 py-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Department</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as Department | "")}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Unassigned —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Sales Manager"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Promote modal (pick user → make admin) ────────────────────────────────────

function PromoteModal({
  users,
  onClose,
  onSaved,
}: {
  users: StaffMember[];         // regular users (role === "user")
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected,  setSelected]  = useState("");
  const [dept,      setDept]      = useState<Department | "">("");
  const [jobTitle,  setJobTitle]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function promote() {
    if (!selected) { setError("Select a user."); return; }
    setSaving(true);
    setError("");
    try {
      // 1. Promote to admin
      const r1 = await fetch(`/api/admin/users/${selected}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
      if (!r1.ok) {
        const d = await r1.json();
        setError(d.error ?? "Failed to promote.");
        return;
      }
      // 2. Set department / job_title
      if (dept || jobTitle.trim()) {
        await fetch(`/api/admin/staff/${selected}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department: dept      || null,
            job_title:  jobTitle.trim() || null,
          }),
        });
      }
      onSaved();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">New Staff</p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">Add Staff Member</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Select User</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Choose a user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">Only registered users without admin access are shown.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Department</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as Department | "")}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Unassigned —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Sales Executive"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            type="button"
            onClick={promote}
            disabled={saving || !selected}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add to Staff"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff card ────────────────────────────────────────────────────────────────

function StaffCard({
  member,
  isSelf,
  canManage,
  onEdit,
  onDemote,
}: {
  member:    StaffMember;
  isSelf:    boolean;
  canManage: boolean;
  onEdit:    () => void;
  onDemote:  () => void;
}) {
  const [confirmDemote, setConfirmDemote] = useState(false);
  const [isPending, startTransition]      = useTransition();
  const dept = deptMeta(member.department);
  const color = avatarColor(member.id);

  function handleDemote() {
    startTransition(onDemote);
    setConfirmDemote(false);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Top row: avatar + identity */}
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${color}`}>
          {initials(member.name, member.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {member.name ?? <span className="italic text-slate-400">No name</span>}
            {isSelf && <span className="ml-1.5 text-[10px] font-normal text-slate-400">(You)</span>}
          </p>
          <p className="truncate text-xs text-slate-500">{member.email}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {member.role === "super_admin" ? (
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
            Super Admin
          </span>
        ) : (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
            Admin
          </span>
        )}
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${dept.color}`}>
          {dept.label}
        </span>
      </div>

      {/* Job title */}
      {member.job_title && (
        <p className="mt-2 text-xs text-slate-500">{member.job_title}</p>
      )}

      {/* Joined */}
      <p className="mt-1 text-[10px] text-slate-400">
        Joined {new Date(member.joined).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      {/* Actions */}
      {canManage && !isSelf && member.role !== "super_admin" && (
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>

          {confirmDemote ? (
            <div className="flex flex-1 items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleDemote}
                disabled={isPending}
                className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
              >
                {isPending ? "Removing…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDemote(false)}
                className="text-xs font-semibold text-slate-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDemote(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  staff:        StaffMember[];   // admins + super_admins
  regularUsers: StaffMember[];   // role === "user" (for promote modal)
  currentId:    string;
  isSuperAdmin: boolean;
}

export default function StaffPanel({ staff, regularUsers, currentId, isSuperAdmin }: Props) {
  const router = useRouter();
  const [activeDept,    setActiveDept]    = useState<Department | "all">("all");
  const [editTarget,    setEditTarget]    = useState<StaffMember | null>(null);
  const [showPromote,   setShowPromote]   = useState(false);

  const deptCounts = DEPARTMENTS.map((d) => ({
    ...d,
    count: staff.filter((s) => s.department === d.value).length,
  }));

  const unassignedCount = staff.filter((s) => !s.department).length;

  const filtered = activeDept === "all"
    ? staff
    : staff.filter((s) => s.department === activeDept);

  async function demoteMember(memberId: string) {
    await fetch(`/api/admin/users/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user" }),
    });
    router.refresh();
  }

  function onSaved() {
    setEditTarget(null);
    setShowPromote(false);
    router.refresh();
  }

  // ── Group by dept for "all" view ────────────────────────────────────────────
  const grouped = DEPARTMENTS.map((d) => ({
    dept:    d,
    members: filtered.filter((s) => s.department === d.value),
  })).filter((g) => g.members.length > 0);

  const unassigned = filtered.filter((s) => !s.department);

  return (
    <>
      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Staff",      value: staff.length,           sub: "Admins & super admins" },
          { label: "Departments Used", value: deptCounts.filter(d => d.count > 0).length, sub: `of ${DEPARTMENTS.length} total` },
          { label: "Unassigned",       value: unassignedCount,        sub: "No department set" },
          { label: "Regular Users",    value: regularUsers.length,    sub: "Can be promoted to staff" },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Department filter tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveDept("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeDept === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            All ({staff.length})
          </button>
          {deptCounts.filter((d) => d.count > 0).map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setActiveDept(d.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeDept === d.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {d.label} ({d.count})
            </button>
          ))}
          {unassignedCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveDept("all")}
              className="rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-slate-400"
            >
              Unassigned ({unassignedCount})
            </button>
          )}
        </div>

        {/* Add staff button */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowPromote(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {/* Non-super-admin notice */}
      {!isSuperAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <strong>View only.</strong> Only the super admin can manage staff roles and departments.
        </div>
      )}

      {/* Cards — grouped by department */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <Building2 className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">No staff in this department yet.</p>
        </div>
      ) : activeDept !== "all" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <StaffCard
              key={m.id}
              member={m}
              isSelf={m.id === currentId}
              canManage={isSuperAdmin}
              onEdit={() => setEditTarget(m)}
              onDemote={() => demoteMember(m.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ dept, members }) => (
            <section key={dept.value}>
              <div className="mb-3 flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${dept.color}`}>
                  {dept.label}
                </span>
                <span className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((m) => (
                  <StaffCard
                    key={m.id}
                    member={m}
                    isSelf={m.id === currentId}
                    canManage={isSuperAdmin}
                    onEdit={() => setEditTarget(m)}
                    onDemote={() => demoteMember(m.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          {unassigned.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-semibold text-slate-400">
                  Unassigned
                </span>
                <span className="text-xs text-slate-400">{unassigned.length} member{unassigned.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {unassigned.map((m) => (
                  <StaffCard
                    key={m.id}
                    member={m}
                    isSelf={m.id === currentId}
                    canManage={isSuperAdmin}
                    onEdit={() => setEditTarget(m)}
                    onDemote={() => demoteMember(m.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Department overview table */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">Department Overview</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-6 py-3 font-semibold text-slate-600">Department</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Members</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Staff</th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((d) => {
                const members = staff.filter((s) => s.department === d.value);
                return (
                  <tr key={d.value} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.color}`}>
                        {d.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{members.length}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {members.length === 0
                        ? <span className="italic text-slate-300">None assigned</span>
                        : members.map((m) => m.name ?? m.email.split("@")[0]).join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      {editTarget && (
        <EditStaffModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={onSaved}
        />
      )}

      {showPromote && (
        <PromoteModal
          users={regularUsers}
          onClose={() => setShowPromote(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
