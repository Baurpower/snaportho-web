import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/brobot/openai-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramMembership, requireUser } from "@/lib/workspace/signout/access";
import { signoutErrorResponse } from "@/lib/workspace/signout/http";
import { buildDraftMessages } from "@/lib/workspace/signout/draft-prompt";
import { getCard, getCardContext } from "@/lib/workspace/signout/repository";

export const runtime = "nodejs";

const DRAFT_MODEL = "gpt-4o-mini";

// POST /api/workspace/signout/cards/[cardId]/draft
// Generate a de-identified attending-update draft. The patient name is NEVER sent to
// the model — the response carries a {{name}} token the browser splices locally.
export async function POST(_request: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  try {
    // Deployment gate: the de-identified clinical narrative still goes to OpenAI, so
    // this stays off until an OpenAI BAA (zero-retention) is in place.
    if (process.env.SIGNOUT_DRAFT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Text generation is disabled. Set SIGNOUT_DRAFT_ENABLED=true (requires an OpenAI BAA for real patient data)." },
        { status: 503 }
      );
    }

    const user = await requireUser();
    const { cardId } = await ctx.params;
    const admin = createAdminClient();
    const context = await getCardContext(admin, cardId);
    if (!context) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, context.programId);

    const card = await getCard(admin, cardId);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const { system, user: userPayload } = buildDraftMessages(card);
    const completion = await getOpenAI().chat.completions.create({
      model: DRAFT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPayload },
      ],
    });

    const draft = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!draft) {
      return NextResponse.json({ error: "The model returned an empty draft." }, { status: 502 });
    }
    return NextResponse.json({ draft }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}
