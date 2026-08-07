import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramMembership, requireUser } from "@/lib/workspace/signout/access";
import { signoutErrorResponse } from "@/lib/workspace/signout/http";
import { getCardContext, revealIdentifiers } from "@/lib/workspace/signout/repository";

type Ctx = { params: Promise<{ cardId: string }> };

// POST /api/workspace/signout/cards/[cardId]/identifiers/reveal
// Audited decrypt of a card's identifiers. Every call logs to signout_id_access.
export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { cardId } = await ctx.params;
    const admin = createAdminClient();
    const context = await getCardContext(admin, cardId);
    if (!context) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, context.programId);

    const identifiers = await revealIdentifiers(admin, cardId, user.id);
    if (!identifiers) {
      return NextResponse.json({ error: "No identifiers on file" }, { status: 404 });
    }
    return NextResponse.json({ identifiers }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}
