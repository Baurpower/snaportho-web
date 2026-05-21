import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  syncAvailabilityEventDays,
  TimeOffType,
} from "@/lib/workspace/call/time-off";

type UpdateBody = {
  eventType?: TimeOffType;
  usingPto?: boolean;
  title?: string | null;
  notes?: string | null;
  location?: string | null;
  startDate?: string;
  endDate?: string;
};

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

    const body = (await request.json()) as UpdateBody;

    if (body.startDate && body.endDate && body.endDate < body.startDate) {
      return NextResponse.json(
        { error: "endDate cannot be before startDate" },
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

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updateQuery = supabase
      .from("availability_events")
      .update(updates)
      .eq("id", id)
      .eq("program_id", membership.program_id);

    const scopedUpdateQuery = membership.roster_id
      ? updateQuery.eq("roster_id", membership.roster_id)
      : updateQuery.eq("membership_id", membership.id);

    const { data, error } = await scopedUpdateQuery
      .select(
        `
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
        `
      )
      .single();

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

    return NextResponse.json({
      item: {
        id: data.id,
        // Compatibility field: `membershipId` carries roster identity in roster-first time-off payloads.
        membershipId: data.roster_id ?? data.membership_id ?? null,
        rosterId: data.roster_id ?? membership.roster_id ?? null,
        programMembershipId: data.membership_id ?? null,
        type: data.event_type,
        usingPto: !!data.using_pto,
        startDate: data.start_date,
        endDate: data.end_date,
        title: data.title ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        approvalStatus: data.approval_status ?? null,
        approved:
          data.approval_status === "approved"
            ? true
            : data.approval_status === "denied"
            ? false
            : null,
        isMine: true,
      },
    });
  } catch (error) {
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
