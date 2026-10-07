import { NextResponse } from "next/server";
import { buildSystemPrompt, COACH_IDS, localCoachReply } from "@/lib/coach";
import type { CoachContext, CoachId } from "@/lib/types";

interface Body {
  coach: CoachId;
  message: string;
  context: CoachContext;
}

function isBody(b: unknown): b is Body {
  if (typeof b !== "object" || b === null) return false;
  const o = b as Record<string, unknown>;
  return (
    typeof o.coach === "string" &&
    (COACH_IDS as string[]).includes(o.coach) &&
    typeof o.message === "string" &&
    o.message.length <= 1000 &&
    typeof o.context === "object" &&
    o.context !== null
  );
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  if (!isBody(body)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ reply: localCoachReply(body.coach, body.context), source: "local" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
        max_tokens: 400,
        system: buildSystemPrompt(body.coach, body.context),
        messages: [{ role: "user", content: body.message }],
      }),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === "text")?.text;
    if (!text) throw new Error("empty reply");
    return NextResponse.json({ reply: text, source: "ai" });
  } catch {
    return NextResponse.json({ reply: localCoachReply(body.coach, body.context), source: "local" });
  }
}
