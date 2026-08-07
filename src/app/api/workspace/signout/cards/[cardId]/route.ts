import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramMembership, requireUser } from "@/lib/workspace/signout/access";
import { signoutErrorResponse, readJsonBody } from "@/lib/workspace/signout/http";
import {
  deleteCard,
  getCardContext,
  updateCard,
} from "@/lib/workspace/signout/repository";
import { parseUpdateCardBody } from "@/lib/workspace/signout/validation";

type Ctx = { params: Promise<{ cardId: string }> };

// PUT /api/workspace/signout/cards/[cardId] — save a card. Requires expectedVersion.
// Returns 409 with the live version when the caller's version is stale.
export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { cardId } = await ctx.params;
    const admin = createAdminClient();
    const context = await getCardContext(admin, cardId);
    if (!context) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, context.programId);

    const { expectedVersion, patch } = parseUpdateCardBody(await readJsonBody(request));
    const result = await updateCard(admin, {
      cardId,
      expectedVersion,
      patch,
      editedBy: user.id,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "This card was edited by someone else. Reload to see the latest.",
          reason: "stale",
          currentVersion: result.currentVersion,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ card: result.card }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}

// DELETE /api/workspace/signout/cards/[cardId] — remove a card.
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { cardId } = await ctx.params;
    const admin = createAdminClient();
    const context = await getCardContext(admin, cardId);
    if (!context) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, context.programId);
    await deleteCard(admin, cardId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}
