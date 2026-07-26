import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateBroBotAnkiRequest, parseJsonBody } from "../_lib";
import { getBroBotAccessGate } from "@/lib/brobot/brobot-entitlement-access";
import { BROBOT_CHAT_MODEL } from "@/lib/brobot/model-config";
import { getOpenAI } from "@/lib/brobot/openai-client";
import { recordSuccessfulAIUse, recordUsageEvent } from "@/lib/brobot/usage";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(12_000),
});

const cardSchema = z.object({
  key: z.string().trim().min(1).max(300),
  topic: z.string().trim().max(300).optional().default("Current card"),
  question: z.string().trim().max(30_000).optional().default(""),
  answer: z.string().trim().max(30_000).optional().default(""),
  deck: z.string().trim().max(500).optional().default(""),
  tags: z.array(z.string().trim().max(300)).max(100).optional().default([]),
});

const requestSchema = z.object({
  message: z.string().trim().min(1).max(8_000),
  conversationId: z.string().uuid().optional(),
  card: cardSchema,
  history: z.array(messageSchema).max(20).optional().default([]),
});

const SYSTEM_PROMPT = `You are BroBot, an orthopaedic teaching assistant inside Anki.
Keep the discussion tightly anchored to the current flashcard and the learner's latest question.
The learner will often ask short follow-ups; resolve them using the supplied card and conversation.
Be clinically accurate, concise, and educational. Clearly separate established facts from uncertainty.
Never invent citations. Do not give patient-specific medical advice.

If asked what an attending would ask:
- Ask one realistic attending-style question first.
- Do not reveal the answer immediately.
- After the learner answers, evaluate briefly and ask a deeper follow-up.

If asked for an OITE board trap or question:
- Present one focused board-style question or trap first.
- Do not reveal the answer immediately.
- After the learner commits, explain the discriminating clue and common mistake.

For ordinary questions, answer directly and invite a natural next step only when useful.
Avoid headings and long generic lectures unless the learner explicitly asks for depth.`;

function cardContext(card: z.infer<typeof cardSchema>): string {
  return [
    `CARD TOPIC: ${card.topic || "Current card"}`,
    card.deck ? `DECK: ${card.deck}` : "",
    card.tags.length ? `TAGS: ${card.tags.join(", ")}` : "",
    card.question ? `CARD FRONT:\n${card.question}` : "",
    card.answer ? `CARD BACK:\n${card.answer}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const auth = await authenticateBroBotAnkiRequest(request);
    if ("response" in auth) return auth.response;

    const parsed = await parseJsonBody(request, requestSchema);
    if (!parsed.success) return parsed.response;

    const subject = { type: "user" as const, id: auth.userId };
    const gate = await getBroBotAccessGate(subject);
    if (gate.isLimitReached) {
      await recordUsageEvent({ subject, outcome: "limit_hit" });
      return NextResponse.json(
        {
          error: "daily_limit_reached",
          message: "Your daily BroBot limit has been reached.",
          remainingToday: 0,
        },
        { status: 429 }
      );
    }

    const body = parsed.data;
    const conversationId = body.conversationId ?? crypto.randomUUID();
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "system" as const, content: cardContext(body.card) },
      ...body.history.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      { role: "user" as const, content: body.message },
    ];

    const completion = await getOpenAI().chat.completions.create({
      model: BROBOT_CHAT_MODEL,
      messages,
      temperature: 0.35,
      max_tokens: 900,
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) throw new Error("BroBot returned an empty response.");

    const usedToday = await recordSuccessfulAIUse(subject, Date.now() - startedAt);
    const remainingToday =
      gate.dailyCap == null ? null : Math.max(0, gate.dailyCap - usedToday);

    return NextResponse.json({
      conversationId,
      messageId: crypto.randomUUID(),
      answer,
      remainingToday,
      cardKey: body.card.key,
    });
  } catch (error) {
    console.error("[brobot-anki-chat]", error);
    return NextResponse.json(
      {
        error: "brobot_unavailable",
        message: "BroBot is having trouble responding. Please try again.",
      },
      { status: 500 }
    );
  }
}
