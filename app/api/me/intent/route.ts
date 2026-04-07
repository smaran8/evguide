import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRACKING_SESSION_ID_KEY } from "@/lib/tracking/identity";

/**
 * GET /api/me/intent
 *
 * Resolves the caller's identity (authenticated user or anonymous session)
 * and returns their user_intent_profiles row.
 * Returns { profile: null } when no profile exists yet — callers should
 * treat this as "show generic content".
 */
export async function GET() {
  try {
    // 1. Try to get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Try to read anonymous session_id from cookie
    const cookieStore = await cookies();
    const rawSessionId = cookieStore.get(TRACKING_SESSION_ID_KEY)?.value ?? null;
    const sessionId =
      rawSessionId ? decodeURIComponent(rawSessionId).trim() || null : null;

    if (!user && !sessionId) {
      return NextResponse.json({ profile: null });
    }

    const admin = createAdminClient();

    // 3. User always takes priority over session — a logged-in user's profile
    //    is merged from all their events regardless of which session they used.
    if (user?.id) {
      const { data, error } = await admin
        .from("user_intent_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[me/intent] user query error:", error.message);
        return NextResponse.json({ profile: null });
      }

      return NextResponse.json({ profile: data ?? null });
    }

    // 4. Anonymous: match session row (where user_id is null, so we don't
    //    accidentally leak another user's profile if the session was later
    //    linked to an account).
    const { data, error } = await admin
      .from("user_intent_profiles")
      .select("*")
      .eq("session_id", sessionId!)
      .is("user_id", null)
      .maybeSingle();

    if (error) {
      console.error("[me/intent] session query error:", error.message);
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: data ?? null });
  } catch (err) {
    console.error("[me/intent] unexpected error:", err);
    return NextResponse.json({ profile: null });
  }
}
