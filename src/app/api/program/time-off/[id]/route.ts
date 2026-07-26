import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";
import {
  assertUsingPtoAllowed,
  syncAvailabilityEventDays,
  type ApprovalStatus,
  type TimeOffType,
} from "@/lib/workspace/call/time-off";

type UpdateBody = {
  eventType?: TimeOffType;
  usingPto?: boolean;
  title?: string | null;
  notes?: string | null;
  location?: string | null;
  startDate?: string;
  endDate?: string;
  approvalStatus?: ApprovalStatus;
  constraintLevel?: "hard" | "soft";
};

const VALID_TYPES = new Set<TimeOffType>([
  "personal",
  "conference",
  "vacation",
  "sick",
  "other",
]);

const VALID_STATUS = new Set<ApprovalStatus>([
  "requested",
  "approved",
  "denied",
]);

function mapItem(data: Record<string, unknown>, isMine: boolean) {
  const approvalStatus =
    typeof data.approval_status === "string" ? data.approval_status : null;

  return {
    id: data.id,
    membershipId: data.roster_id ?? data.membership_id ?? null,
    rosterId: data.roster_id ?? null,
    programMembershipId: data.membership_id ?? null,
    type: data.event_type,
    usingPto: Boolean(data.using_pto),
    startDate: data.start_date,
    endDate: data.end_date,
    title: data.title ?? null,
    location: data.location ?? null,
    notes: data.notes ?? null,
    approvalStatus,
    approved:
      approvalStatus === "approved"
        ? true
        : approvalStatus === "denied"
          ? false
          : null,
    isMine,
  };
}

const SELECT_FIELDS = `
  id,
  program_id,
  membership_id,
  roster_id,
  event_type,
  using_pto,
  source_kind,
  constraint_level,
  start_date,
  end_date,
  title,
  location,
  notes,
  approval_status,
  updated_at
`;

async function loadEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  programId: string
) {
  const { data, error } = await supabase
    .from("availability_events")
    .select(SELECT_FIELDS)
    .eq("id", id)
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load time-off event");
  }

  return data;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing time-off id" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.id || !membership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    let isProgramAdmin = false;
    try {
      await requireWorkspacePermission({
        userId: user.id,
        permission: "canUploadTimeOff",
        programId: membership.program_id,
        allowUnlinkedRoster: true,
      });
      isProgramAdmin = true;
    } catch (error) {
      if (!(error instanceof WorkspacePermissionError)) {
        throw error;
      }
      isProgramAdmin = false;
    }

    const body = (await request.json()) as UpdateBody;

    if (body.startDate && body.endDate && body.endDate < body.startDate) {
      return NextResponse.json(
        { error: "endDate cannot be before startDate" },
        { status: 400 }
      );
    }

    if (body.eventType !== undefined && !VALID_TYPES.has(body.eventType)) {
      return NextResponse.json(
        { error: `Unsupported eventType: ${body.eventType}` },
        { status: 400 }
      );
    }

    if (
      body.approvalStatus !== undefined &&
      !VALID_STATUS.has(body.approvalStatus)
    ) {
      return NextResponse.json(
        { error: `Unsupported approvalStatus: ${body.approvalStatus}` },
        { status: 400 }
      );
    }

    if (!isProgramAdmin && body.approvalStatus !== undefined) {
      return NextResponse.json(
        { error: "Only program admins can change approval status." },
        { status: 403 }
      );
    }

    const existing = await loadEvent(supabase, id, membership.program_id);

    if (!existing) {
      return NextResponse.json(
        { error: "Time-off request not found" },
        { status: 404 }
      );
    }

    const ownsEvent =
      (!!membership.roster_id &&
        (existing.roster_id === membership.roster_id ||
          existing.membership_id === membership.id)) ||
      (!membership.roster_id && existing.membership_id === membership.id);

    if (!isProgramAdmin && !ownsEvent) {
      return NextResponse.json(
        { error: "Time-off request not found or not editable" },
        { status: 404 }
      );
    }

    const nextEventType = (body.eventType ??
      existing.event_type ??
      "personal") as TimeOffType;
    const nextUsingPto =
      body.usingPto !== undefined ? body.usingPto : Boolean(existing.using_pto);

    try {
      assertUsingPtoAllowed(nextEventType, nextUsingPto);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid usingPto for event type",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.eventType !== undefined) updates.event_type = body.eventType;
    if (body.usingPto !== undefined) updates.using_pto = body.usingPto;
    if (body.title !== undefined) updates.title = body.title;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.location !== undefined) updates.location = body.location;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.endDate !== undefined) updates.end_date = body.endDate;
    if (body.approvalStatus !== undefined) {
      updates.approval_status = body.approvalStatus;
      if (body.constraintLevel === undefined) {
        updates.constraint_level =
          body.approvalStatus === "approved" ? "hard" : "soft";
      }
    }
    if (body.constraintLevel !== undefined) {
      updates.constraint_level = body.constraintLevel;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    let updateQuery = supabase
      .from("availability_events")
      .update(updates)
      .eq("id", id)
      .eq("program_id", membership.program_id);

    if (!isProgramAdmin) {
      updateQuery = membership.roster_id
        ? updateQuery.eq("roster_id", membership.roster_id)
        : updateQuery.eq("membership_id", membership.id);
    }

    const { data, error } = await updateQuery.select(SELECT_FIELDS).single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update time-off event" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Time-off request not found or not editable" },
        { status: 404 }
      );
    }

    const resolvedRosterId = data.roster_id ?? membership.roster_id ?? null;

    if (!resolvedRosterId) {
      return NextResponse.json(
        { error: "Time-off request is missing roster identity" },
        { status: 400 }
      );
    }

    const datesChanged =
      body.startDate !== undefined ||
      body.endDate !== undefined ||
      body.eventType !== undefined;

    if (datesChanged || body.usingPto !== undefined) {
      await syncAvailabilityEventDays({
        eventId: data.id,
        programId: data.program_id,
        membershipId: data.membership_id ?? null,
        rosterId: resolvedRosterId,
        eventType: (data.event_type ?? "personal") as TimeOffType,
        sourceKind: data.source_kind ?? "self_reported",
        constraintLevel: data.constraint_level ?? "soft",
        startDate: data.start_date,
        endDate: data.end_date,
      });
    }

    return NextResponse.json({
      item: mapItem(data as Record<string, unknown>, ownsEvent || isProgramAdmin),
    });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update time-off event",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing time-off id" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.id || !membership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    let isProgramAdmin = false;
    try {
      await requireWorkspacePermission({
        userId: user.id,
        permission: "canUploadTimeOff",
        programId: membership.program_id,
        allowUnlinkedRoster: true,
      });
      isProgramAdmin = true;
    } catch (error) {
      if (!(error instanceof WorkspacePermissionError)) {
        throw error;
      }
      isProgramAdmin = false;
    }

    const existing = await loadEvent(supabase, id, membership.program_id);

    if (!existing) {
      return NextResponse.json(
        { error: "Time-off request not found" },
        { status: 404 }
      );
    }

    const ownsEvent =
      (!!membership.roster_id &&
        (existing.roster_id === membership.roster_id ||
          existing.membership_id === membership.id)) ||
      (!membership.roster_id && existing.membership_id === membership.id);

    if (!isProgramAdmin) {
      if (!ownsEvent) {
        return NextResponse.json(
          { error: "Time-off request not found or not deletable" },
          { status: 404 }
        );
      }
      if (existing.approval_status !== "requested") {
        return NextResponse.json(
          {
            error:
              "Only requested time-off can be deleted by the resident. Ask a program admin for help.",
          },
          { status: 403 }
        );
      }
    }

    let deleteQuery = supabase
      .from("availability_events")
      .delete()
      .eq("id", id)
      .eq("program_id", membership.program_id);

    if (!isProgramAdmin) {
      deleteQuery = membership.roster_id
        ? deleteQuery.eq("roster_id", membership.roster_id)
        : deleteQuery.eq("membership_id", membership.id);
    }

    const { error } = await deleteQuery;

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete time-off event" },
        { status: 400 }
      );
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete time-off event",
      },
      { status: 500 }
    );
  }
}
