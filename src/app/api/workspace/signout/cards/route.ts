import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspacePermissionError } from "@/lib/workspace/access-control";
import { requireProgramMembership, requireUser } from "@/lib/workspace/signout/access";
import { signoutErrorResponse, readJsonBody } from "@/lib/workspace/signout/http";
import {
  createCard,
  getServiceProgramId,
  listCards,
} from "@/lib/workspace/signout/repository";
import { parseCreateCardBody } from "@/lib/workspace/signout/validation";

// GET /api/workspace/signout/cards?serviceId=... — list a service's cards.
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const serviceId = request.nextUrl.searchParams.get("serviceId");
    if (!serviceId) {
      throw new WorkspacePermissionError("serviceId is required", 400);
    }
    const admin = createAdminClient();
    const programId = await getServiceProgramId(admin, serviceId);
    if (!programId) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, programId);
    const cards = await listCards(admin, serviceId);
    return NextResponse.json({ cards }, { status: 200 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}

// POST /api/workspace/signout/cards?serviceId=... — add a patient card.
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const serviceId = request.nextUrl.searchParams.get("serviceId");
    if (!serviceId) {
      throw new WorkspacePermissionError("serviceId is required", 400);
    }
    const admin = createAdminClient();
    const programId = await getServiceProgramId(admin, serviceId);
    if (!programId) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    await requireProgramMembership(user.id, programId);
    const input = parseCreateCardBody(await readJsonBody(request));
    const card = await createCard(admin, {
      serviceId,
      createdBy: user.id,
      ...input,
    });
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    return signoutErrorResponse(error);
  }
}
