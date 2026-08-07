import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspacePermissionError } from "@/lib/workspace/access-control";
import { requireProgramMembership, requireUser } from "@/lib/workspace/signout/access";
import { signoutErrorResponse, readJsonBody } from "@/lib/workspace/signout/http";
import { getCardContext, upsertIdentifiers } from "@/lib/workspace/signout/repository";
import { parseIdentifiersBody } from "@/lib/workspace/signout/validation";

type Ctx = { params: Promise<{ cardId: string }> };

// POST /api/workspace/signout/cards/[cardId]/identifiers
// Store name/DOB/MRN under the separate identifier key. PHI mode must be on.
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { cardId } = await ctx.params;
    const admin = createAdminClient();
    const context = await getCardContext(admin, cardId);
    if (!context) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, context.programId);
    if (!context.phiEnabled) {
      throw new WorkspacePermissionError(
        "PHI mode is off for this service. Enable it before storing patient identifiers.",
        403
      );
    }
    const ids = parseIdentifiersBody(await readJsonBody(request));
    await upsertIdentifiers(admin, cardId, ids, user.id);
    return NextResponse.json({ ok: true, hasIdentifiers: true }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}
