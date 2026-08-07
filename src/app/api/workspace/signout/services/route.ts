import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveProgramId, requireUser } from "@/lib/workspace/signout/access";
import { signoutErrorResponse, readJsonBody } from "@/lib/workspace/signout/http";
import { createService, listServices } from "@/lib/workspace/signout/repository";
import { parseCreateServiceBody } from "@/lib/workspace/signout/validation";

// GET /api/workspace/signout/services — list services for the caller's program.
export async function GET() {
  try {
    const user = await requireUser();
    const programId = await requireActiveProgramId(user.id);
    const services = await listServices(createAdminClient(), programId);
    return NextResponse.json({ services }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}

// POST /api/workspace/signout/services — any active member may create a service.
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const programId = await requireActiveProgramId(user.id);
    const { name } = parseCreateServiceBody(await readJsonBody(request));
    const service = await createService(createAdminClient(), {
      programId,
      name,
      createdBy: user.id,
    });
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}
