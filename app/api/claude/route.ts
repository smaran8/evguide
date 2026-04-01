import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ClaudeRequest = {
  prompt?: string;
};

function extractText(content: Anthropic.Messages.Message["content"]) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as ClaudeRequest;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey.startsWith("PASTE_")) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY in environment." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest";

    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = extractText(message.content);

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get response from Claude.";
    console.error("Claude API error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
