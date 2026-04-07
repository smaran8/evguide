# Required Migrations for evguide Database

To fix the "Could not find the table 'public.user_intent_profiles'" error, you need to apply these SQL migrations in your Supabase project.

## Steps:

1. Go to your Supabase project dashboard: https://app.supabase.com/
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query and paste each migration block below **IN ORDER**
4. Execute each one

---

## Migration 1: Create Helper Function

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at := timezone('utc', now());
  RETURN new;
END;
$$;
```

---

## Migration 2: Phase 1 - User Preferences & Recommendations

Copy the entire contents of: `Documentation/phase1-sql-schema.sql`

---

## Migration 3: Phase 2 - User Events Tracking

Copy the entire contents of: `Documentation/phase2-sql-user-events.sql`

---

## Migration 4: Phase 3 - Lead Scores

Copy the entire contents of: `Documentation/phase3-sql-lead-scores.sql`

---

## Migration 5: Phase 4 - User Car Interest

Copy the entire contents of: `Documentation/phase4-sql-user-car-interest.sql`

---

## Migration 6: Phase 5 - Financial Profiles

Copy the entire contents of: `Documentation/phase5-sql-financial-profiles.sql`

---

## Migration 7: Phase 6 - User Intent Profiles (CREATES THE MISSING TABLE)

Copy the entire contents of: `Documentation/phase6-sql-user-intent-profiles.sql`

---

## Migration 8: Phase 9 - Buyer Style Segmentation

Copy the entire contents of: `Documentation/phase9-sql-buyer-style-segmentation.sql`

---

## Migration 9: CRM Workflow Tables

Copy the entire contents of: `supabase/manual/001_create_crm_tables.sql`

---

## Migration 10: Test Drive Bookings

Copy the entire contents of: `supabase/manual/002_create_test_drive_bookings.sql`

---

## Migration 11: Vehicle Tier Segmentation

Copy the entire contents of: `supabase/manual/003_add_vehicle_tier.sql`

---

## Quick Verification

After applying all migrations, run this query in SQL Editor to verify the table exists:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_intent_profiles'
ORDER BY ordinal_position;
```

You should see 18+ columns listed.

