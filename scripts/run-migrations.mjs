/**
 * scripts/run-migrations.mjs
 * One-time script that creates Phase 1 tables in Supabase.
 * Usage: node scripts/run-migrations.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText   = readFileSync(resolve(__dirname, "../.env.local"), "utf8");

function getEnv(key) {
  const line = envText.split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`Missing env var: ${key}`);
  return line.slice(key.length + 1).trim();
}

const SUPABASE_URL     = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const PROJECT_REF      = new URL(SUPABASE_URL).hostname.split(".")[0];

const SQL = `
CREATE TABLE IF NOT EXISTS user_preferences (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  monthly_income        numeric(12,2) NOT NULL CHECK (monthly_income > 0),
  total_budget          numeric(12,2) NOT NULL CHECK (total_budget > 0),
  down_payment          numeric(12,2) NOT NULL CHECK (down_payment >= 0),
  preferred_monthly_emi numeric(12,2) NOT NULL CHECK (preferred_monthly_emi > 0),
  usage_type            text NOT NULL CHECK (usage_type IN ('city','highway','mixed')),
  family_size           integer NOT NULL CHECK (family_size BETWEEN 1 AND 10),
  charging_access       text NOT NULL CHECK (charging_access IN ('home','public','none')),
  preferred_body_type   text NOT NULL DEFAULT 'any' CHECK (preferred_body_type IN ('suv','hatchback','sedan','any')),
  created_at            timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_date ON user_preferences(created_at DESC);

CREATE TABLE IF NOT EXISTS recommendations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id  uuid NOT NULL REFERENCES user_preferences(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ev_id          text NOT NULL,
  ev_brand       text NOT NULL,
  ev_model_name  text NOT NULL,
  score          numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  rank           integer NOT NULL CHECK (rank IN (1,2,3)),
  estimated_emi  numeric(12,2) NOT NULL,
  reasons        text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recs_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recs_pref ON recommendations(preference_id);
CREATE INDEX IF NOT EXISTS idx_recs_rank ON recommendations(rank);

CREATE TABLE IF NOT EXISTS vehicle_queries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id  uuid REFERENCES user_preferences(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ev_id          text NOT NULL,
  ev_brand       text NOT NULL,
  ev_model_name  text NOT NULL,
  score          numeric(5,2),
  rank           integer,
  full_name      text NOT NULL CHECK (length(trim(full_name)) >= 2),
  email          text NOT NULL,
  phone          text,
  notes          text,
  status         text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','resolved')),
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vq_user    ON vehicle_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_vq_ev      ON vehicle_queries(ev_id);
CREATE INDEX IF NOT EXISTS idx_vq_status  ON vehicle_queries(status);
CREATE INDEX IF NOT EXISTS idx_vq_created ON vehicle_queries(created_at DESC);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_own_preferences" ON user_preferences;
CREATE POLICY "insert_own_preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "read_own_preferences" ON user_preferences;
CREATE POLICY "read_own_preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_own_recommendations" ON recommendations;
CREATE POLICY "insert_own_recommendations" ON recommendations FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "read_own_recommendations" ON recommendations;
CREATE POLICY "read_own_recommendations" ON recommendations FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE vehicle_queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_vehicle_queries" ON vehicle_queries;
CREATE POLICY "insert_vehicle_queries" ON vehicle_queries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "read_own_vehicle_queries" ON vehicle_queries;
CREATE POLICY "read_own_vehicle_queries" ON vehicle_queries FOR SELECT USING (auth.uid() = user_id);
`;

async function main() {
  console.log("Project ref : " + PROJECT_REF);
  console.log("Supabase URL: " + SUPABASE_URL + "\n");

  // Try the Supabase Management API
  const mgmtRes = await fetch(
    "https://api.supabase.com/v1/projects/" + PROJECT_REF + "/database/query",
    {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SERVICE_ROLE_KEY },
      body:    JSON.stringify({ query: SQL }),
    }
  );

  if (mgmtRes.ok) {
    console.log("Migrations applied via Management API.\n");
  } else {
    const body = await mgmtRes.text();
    console.log("Management API returned " + mgmtRes.status + ": " + body.slice(0, 300));
    console.log("Trying direct pg/query endpoint…\n");

    const pgRes = await fetch(SUPABASE_URL + "/pg/query", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        SERVICE_ROLE_KEY,
        "Authorization": "Bearer " + SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: SQL }),
    });

    const pgBody = await pgRes.text();
    if (pgRes.ok) {
      console.log("Migrations applied via pg/query.\n");
    } else {
      console.error("pg/query also failed (" + pgRes.status + "): " + pgBody.slice(0, 300));
      console.log("\nMANUAL FALLBACK: Open Supabase SQL Editor and run the two SQL files in Documentation/");
    }
  }

  // Verify
  console.log("Verifying tables:");
  for (const table of ["user_preferences", "recommendations", "vehicle_queries"]) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?limit=0", {
      headers: { "apikey": SERVICE_ROLE_KEY, "Authorization": "Bearer " + SERVICE_ROLE_KEY },
    });
    console.log("  " + (r.ok ? "OK" : "MISSING") + "  " + table + "  [HTTP " + r.status + "]");
  }
}

main().catch(console.error);
