// Client-side consultation API helpers.
// Called from ConsultationWizard — never import on the server.

import { getPlatformSessionId } from "@/lib/platform/session";
import type {
  CreateConsultationResult,
  UpdateConsultationPayload,
} from "@/types/consultation";

/**
 * Creates an empty consultation row tied to the current platform session.
 * Called when the wizard opens so we have an ID for progressive answer saving.
 * Returns the new consultation UUID, or null on failure.
 */
export async function createConsultation(): Promise<string | null> {
  try {
    const res = await fetch("/api/consultation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: getPlatformSessionId() }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as CreateConsultationResult;
    return data.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Patches an existing consultation row with the provided fields.
 * Optionally also batch-inserts consultation_answers rows via the same route.
 * Silent on failure — saves are best-effort and must not block the UI.
 */
export async function updateConsultation(
  id: string,
  payload: UpdateConsultationPayload,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/consultation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch {
    return false;
  }
}
