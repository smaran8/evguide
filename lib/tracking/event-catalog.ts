import type { UserEventType } from "@/types";

export const ALLOWED_TRACKED_EVENTS: UserEventType[] = [
  "page_view",
  "car_view",
  "vehicle_view",
  "engagement_milestone",
  "recommendation_started",
  "recommendation_completed",
  "emi_used",
  "compare_clicked",
  "price_filter_used",
  "filter_used",
  "loan_offer_clicked",
  "repeat_visit",
  "consultation_started",
  "consultation_submitted",
  "test_drive_clicked",
  "finance_apply_clicked",
  "reserve_clicked",
  "sort_changed",
  "save_clicked",
  "tier_section_viewed",
  "search_used",
];

export const FINANCIAL_PROFILE_SIGNAL_EVENTS: UserEventType[] = [
  "emi_used",
  "price_filter_used",
  "filter_used",
  "loan_offer_clicked",
];

export const STRONG_CTA_EVENTS: UserEventType[] = [
  "test_drive_clicked",
  "finance_apply_clicked",
  "reserve_clicked",
];
