import OpenAI from "openai";
import { evModels } from "@/data/evModels";
import { applyRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

// ─── Intent detection ─────────────────────────────────────────────────────────

type Intent = "discovery" | "question" | "compare" | "finance" | "buying";

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/\bvs\b|compar|versus|better|difference|between/.test(t)) return "compare";
  if (/\bfinance|monthly|pcp|lease|deposit|apr|afford|payment/.test(t)) return "finance";
  if (/\bbuy|purchase|order|deal|quote|ready|when can/.test(t)) return "buying";
  if (/\bhow|what|why|when|where|does|is it|can i|range|charg|battery|speed/.test(t)) return "question";
  return "discovery";
}

// ─── Vehicle list for system prompt ───────────────────────────────────────────

const VEHICLE_LIST = evModels
  .map((v) => `${v.brand} ${v.model} (£${v.price.toLocaleString()}, ${Math.round(v.rangeKm * 0.621)} mi range)`)
  .join("; ");

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are EV Guide AI — a friendly, knowledgeable assistant helping UK car buyers find their perfect electric vehicle.

You have deep expertise in:
- Electric vehicle specifications, real-world range, charging speeds, and running costs
- UK finance options: PCP, HP, lease, and PCH — with typical APR rates and monthly cost estimates
- UK charging infrastructure: home wallbox installation, public networks (Osprey, BP Pulse, Pod Point, Gridserve, Ionity)
- Total cost of ownership: energy costs at ~28p/kWh home, ~70p/kWh public, insurance bands, VED, servicing
- EV incentives: no VED for EVs under £40k, company car BIK rates, Workplace Charging Scheme
- Real-world considerations: range anxiety, cold weather range loss (~15–20%), towing, family practicality

Vehicles available in our system:
${VEHICLE_LIST}

How to behave:
- Be conversational, warm, and concise. Never robotic.
- If a user's request is vague (e.g. "recommend an EV"), ask 2–3 short clarifying questions: budget (monthly or upfront), typical weekly mileage, and home charging situation.
- Once you have enough context, recommend 2–3 specific vehicles. Always bold the vehicle name (**Brand Model**), give a one-line headline, then 2–3 bullet points covering range, monthly finance estimate (10% deposit, 48-month PCP at ~8.5% APR), and best use case.
- When comparing, be honest about weaknesses. Do not hype.
- For finance questions, give concrete monthly figures. Always note these are estimates.
- Keep responses focused. One sharp recommendation beats five vague ones.
- Only recommend vehicles from the list above.`;

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "chat", 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let messages: ChatMessage[];
  let intent: Intent = "discovery";
  try {
    const body = (await request.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required." }), { status: 400 });
    }
    messages = (body.messages as ChatMessage[]).slice(-20);
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) intent = detectIntent(lastUser.content);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured." }), { status: 500 });
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const maxTokens = intent === "compare" || intent === "finance" ? 1536 : 1024;

  let stream;
  try {
    stream = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed";
    console.error("[/api/chat] OpenAI error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Chat-Intent": intent,
    },
  });
}
