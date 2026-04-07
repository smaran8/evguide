"use client";

import { startTransition, useState } from "react";
import type { CrmLeadPriority, CrmLeadRecordRow, CrmLeadStatus } from "@/types";

type Props = {
  profileId: string;
  crm: CrmLeadRecordRow | null;
};

export default function CrmLeadActions({ profileId, crm }: Props) {
  const [status, setStatus] = useState<CrmLeadStatus>(crm?.status ?? "new");
  const [priority, setPriority] = useState<CrmLeadPriority>(crm?.priority ?? "medium");
  const [ownerName, setOwnerName] = useState(crm?.owner_name ?? "");
  const [tags, setTags] = useState((crm?.tags ?? []).join(", "));
  const [followUpAt, setFollowUpAt] = useState(
    crm?.next_follow_up_at ? crm.next_follow_up_at.slice(0, 16) : ""
  );
  const [qualificationNotes, setQualificationNotes] = useState(crm?.qualification_notes ?? "");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/crm/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          owner_name: ownerName.trim() || null,
          tags: tags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          next_follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
          qualification_notes: qualificationNotes.trim() || null,
        }),
      });

      const data = await response.json().catch(() => null);
      setSaving(false);

      if (!response.ok) {
        setMessage(data?.error ?? "Unable to save CRM details.");
        return;
      }

      setMessage("CRM lead updated.");
    });
  }

  function handleAddNote() {
    const trimmed = note.trim();
    if (!trimmed) return;

    setSaving(true);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/crm/${profileId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });

      const data = await response.json().catch(() => null);
      setSaving(false);

      if (!response.ok) {
        setMessage(data?.error ?? "Unable to add note.");
        return;
      }

      setNote("");
      setMessage("Note added. Refresh to see the new entry.");
    });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">CRM Actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Qualify, prioritize, assign, and plan follow-up on this lead.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-600">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as CrmLeadStatus)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="nurture">Nurture</option>
            <option value="hot">Hot</option>
            <option value="contacted">Contacted</option>
            <option value="follow_up">Follow up</option>
            <option value="converted">Converted</option>
            <option value="closed_lost">Closed lost</option>
          </select>
        </label>

        <label className="text-sm text-slate-600">
          Priority
          <select value={priority} onChange={(event) => setPriority(event.target.value as CrmLeadPriority)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>

        <label className="text-sm text-slate-600">
          Owner
          <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Sales owner name" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        </label>

        <label className="text-sm text-slate-600">
          Next follow-up
          <input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        </label>
      </div>

      <label className="block text-sm text-slate-600">
        Tags
        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="real-user, repeat-visitor, finance-heavy" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
      </label>

      <label className="block text-sm text-slate-600">
        Qualification notes
        <textarea value={qualificationNotes} onChange={(event) => setQualificationNotes(event.target.value)} rows={4} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save CRM details"}
      </button>

      <div className="border-t border-slate-100 pt-4">
        <label className="block text-sm text-slate-600">
          Add note
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Called user, asked about charging access, wants SUV shortlist..." className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        </label>
        <button
          type="button"
          onClick={handleAddNote}
          disabled={saving || note.trim().length === 0}
          className="mt-3 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add note
        </button>
      </div>

      {message && <p className="text-sm text-slate-500">{message}</p>}
    </div>
  );
}
