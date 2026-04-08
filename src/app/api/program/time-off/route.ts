// app/api/program/time-off/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import {
  createTimeOffEvent,
  TimeOffType,
  ApprovalStatus,
  ConstraintLevel,
} from "@/lib/db/time-off";

type CreateBody = {
  eventType: TimeOffType;
  usingPto?: boolean;
  sourceKind?: string;
  constraintLevel?: ConstraintLevel | string;
  title?: string | null;
  notes?: string | null;
  location?: string | null;
  startDate: string;
  endDate: string;
  approvalStatus?: ApprovalStatus;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id || !membership?.id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CreateBody;

    if (!body?.eventType || !body?.startDate || !body?.endDate) {
      return NextResponse.json(
        { error: "eventType, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const result = await createTimeOffEvent({
      programId: membership.program_id,
      membershipId: membership.id,
      createdByUserId: user.id,
      eventType: body.eventType,
      usingPto: body.usingPto ?? false,
      sourceKind: body.sourceKind ?? "self_reported",
      constraintLevel: body.constraintLevel ?? "soft",
      title: body.title ?? null,
      notes: body.notes ?? null,
      location: body.location ?? null,
      startDate: body.startDate,
      endDate: body.endDate,
      approvalStatus: body.approvalStatus ?? "requested",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create time-off event",
      },
      { status: 500 }
    );
  }
}