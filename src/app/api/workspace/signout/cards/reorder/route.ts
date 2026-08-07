import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramMembership, requireUser } from "@/lib/workspace/signout/access";
import { signoutErrorResponse, readJsonBody } from "@/lib/workspace/signout/http";
import { getServiceProgramId, reorderCards } from "@/lib/workspace/signout/repository";
import { parseReorderBody } from "@/lib/workspace/signout/validation";

// PATCH /api/workspace/signout/cards/reorder — persist drag-order / pin for a service.
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const { serviceId, items } = parseReorderBody(await readJsonBody(request));
    const admin = createAdminClient();
    const programId = await getServiceProgramId(admin, serviceId);
    if (!programId) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, programId);
    await reorderCards(admin, serviceId, items);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}
