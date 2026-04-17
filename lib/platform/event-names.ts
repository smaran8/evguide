// All event names for the AI platform tracking layer (migration 011).
// These write to the new user_events table (platform schema),
// NOT to the legacy tracking_events table.

export const PLATFORM_EVENTS = [
  // ── Page / session ──────────────────────────────────────────
  "session_started",
  "session_ended",
  "page_view",
  "page_scroll_25",
  "page_scroll_50",
  "page_scroll_75",
  "page_scroll_100",
  "clicked_primary_cta",
  "clicked_secondary_cta",
  // ── Vehicle discovery ────────────────────────────────────────
  "viewed_vehicle_list",
  "filtered_vehicle_list",
  "sorted_vehicle_list",
  "searched_vehicle",
  "viewed_vehicle_detail",
  "clicked_vehicle_card",
  "saved_vehicle",
  "shared_vehicle",
  // ── Comparison ───────────────────────────────────────────────
  "opened_compare_tool",
  "added_vehicle_to_compare",
  "removed_vehicle_from_compare",
  "completed_vehicle_compare",
  // ── Finance ──────────────────────────────────────────────────
  "opened_emi_calculator",
  "changed_emi_inputs",
  "calculated_emi",
  "viewed_finance_offer",
  "selected_finance_offer",
  "started_finance_form",
  "submitted_finance_request",
  // ── Consultation ─────────────────────────────────────────────
  "opened_consultation_popup",
  "started_consultation",
  "answered_consultation_question",
  "completed_consultation",
  "viewed_ai_recommendation",
  "clicked_recommended_vehicle",
  "requested_follow_up_after_recommendation",
  // ── Charging ─────────────────────────────────────────────────
  "viewed_charging_content",
  "used_range_calculator",
  "viewed_charging_time",
  "viewed_charge_cost_estimate",
  // ── Lead / conversion ────────────────────────────────────────
  "submitted_contact_form",
  "clicked_call_now",
  "clicked_whatsapp",
  "booked_test_drive",
  "booked_callback",
  "became_known_user",
] as const;

export type PlatformEventName = (typeof PLATFORM_EVENTS)[number];

export function isPlatformEventName(value: string): value is PlatformEventName {
  return PLATFORM_EVENTS.includes(value as PlatformEventName);
}
