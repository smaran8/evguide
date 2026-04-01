import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type HealthDetails = {
  env: {
    hasSupabaseUrl: boolean;
    hasSupabaseAnonKey: boolean;
    hasSupabaseServiceRoleKey: boolean;
    hasAnthropicApiKey: boolean;
    claudeModel: string;
  };
  supabase: {
    reachable: boolean;
    error: string | null;
  };
  anthropic: {
    reachable: boolean;
    error: string | null;
  };
};

async function checkSupabase(url: string, anonKey: string) {
  try {
    const client = createSupabaseClient(url, anonKey);
    const { error } = await client.from("ev_models").select("id").limit(1);

    if (error) {
      return { reachable: false, error: error.message };
    }

    return { reachable: true, error: null };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : "Unknown Supabase error",
    };
  }
}

async function checkAnthropic(apiKey: string) {
  try {
    const anthropic = new Anthropic({ apiKey });
    await anthropic.models.list();
    return { reachable: true, error: null };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : "Unknown Anthropic error",
    };
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";
  const claudeModel = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest";

  const details: HealthDetails = {
    env: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseAnonKey: Boolean(supabaseAnon),
      hasSupabaseServiceRoleKey: Boolean(serviceRole),
      hasAnthropicApiKey: Boolean(anthropicApiKey),
      claudeModel,
    },
    supabase: { reachable: false, error: "Missing Supabase env" },
    anthropic: { reachable: false, error: "Missing Anthropic env" },
  };

  if (supabaseUrl && supabaseAnon) {
    details.supabase = await checkSupabase(supabaseUrl, supabaseAnon);
  }

  if (anthropicApiKey && !anthropicApiKey.startsWith("PASTE_")) {
    details.anthropic = await checkAnthropic(anthropicApiKey);
  } else if (anthropicApiKey.startsWith("PASTE_")) {
    details.anthropic = {
      reachable: false,
      error: "ANTHROPIC_API_KEY is still a placeholder value",
    };
  }

  const ok =
    details.env.hasSupabaseUrl &&
    details.env.hasSupabaseAnonKey &&
    details.supabase.reachable;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      details,
    },
    { status: ok ? 200 : 503 }
  );
}
