import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

type RouteContext = {
  params: Promise<{
    callId: string;
  }>;
};

type CallAssignmentRow = {
  id: string;
  program_id: string | null;
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  site: string | null;
  is_home_call: boolean | null;
  notes: string | null;
};

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isUniqueConstraintError(message: string) {
  return (
    message.includes("call_assignments_unique_membership_date_type") ||
    message.toLowerCase().includes("duplicate key value violates unique constraint")
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { callId } = await context.params;

    if (!callId) {
      return NextResponse.json({ error: "Missing call id" }, { status: 400 });
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const { data: existingCall, error: existingCallError } = await supabase
      .from("call_assignments")
      .select(
        "id, program_id, program_membership_id, call_type, call_date, start_datetime, end_datetime, site, is_home_call, notes"
      )
      .eq("id", callId)
      .eq("program_id", activeMembership.program_id)
      .single<CallAssignmentRow>();

    if (existingCallError || !existingCall) {
      return NextResponse.json(
        { error: "Call assignment not found for this program" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);

    const nextProgramMembershipId =
      body?.programMembershipId === undefined
        ? existingCall.program_membership_id
        : body.programMembershipId;

    const nextCallType =
      body?.callType === undefined
        ? existingCall.call_type
        : normalizeNullableString(body.callType);

    const nextCallDate =
      body?.callDate === undefined
        ? existingCall.call_date
        : body.callDate === null
        ? null
        : body.callDate;

    const nextStartDatetime =
      body?.startDatetime === undefined
        ? existingCall.start_datetime
        : body.startDatetime === null
        ? null
        : body.startDatetime;

    const nextEndDatetime =
      body?.endDatetime === undefined
        ? existingCall.end_datetime
        : body.endDatetime === null
        ? null
        : body.endDatetime;

    const nextSite =
      body?.site === undefined ? existingCall.site : normalizeNullableString(body.site);

    const nextIsHomeCall =
      body?.isHomeCall === undefined
        ? existingCall.is_home_call ?? false
        : Boolean(body.isHomeCall);

    const nextNotes =
      body?.notes === undefined
        ? existingCall.notes
        : normalizeNullableString(body.notes);

    if (!nextProgramMembershipId) {
      return NextResponse.json(
        { error: "programMembershipId is required" },
        { status: 400 }
      );
    }

    if (!nextCallType) {
      return NextResponse.json({ error: "callType is required" }, { status: 400 });
    }

    if (nextCallDate !== null && !isValidDateString(nextCallDate)) {
      return NextResponse.json(
        { error: "callDate must be YYYY-MM-DD or null" },
        { status: 400 }
      );
    }

    if (nextStartDatetime !== null && !isValidIsoDateTime(nextStartDatetime)) {
      return NextResponse.json(
        { error: "startDatetime must be a valid ISO datetime or null" },
        { status: 400 }
      );
    }

    if (nextEndDatetime !== null && !isValidIsoDateTime(nextEndDatetime)) {
      return NextResponse.json(
        { error: "endDatetime must be a valid ISO datetime or null" },
        { status: 400 }
      );
    }

    const { data: targetMembership, error: targetMembershipError } = await supabase
      .from("program_memberships")
      .select("id")
      .eq("id", nextProgramMembershipId)
      .eq("program_id", activeMembership.program_id)
      .single();

    if (targetMembershipError || !targetMembership) {
      return NextResponse.json(
        { error: "Target resident is not in this program" },
        { status: 400 }
      );
    }

    const updatePayload = {
      program_membership_id: nextProgramMembershipId,
      call_type: nextCallType,
      call_date: nextCallDate,
      start_datetime: nextStartDatetime,
      end_datetime: nextEndDatetime,
      site: nextSite,
      is_home_call: nextIsHomeCall,
      notes: nextNotes,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedCall, error: updateError } = await supabase
      .from("call_assignments")
      .update(updatePayload)
      .eq("id", callId)
      .eq("program_id", activeMembership.program_id)
      .select()
      .single();

    if (updateError) {
      if (isUniqueConstraintError(updateError.message)) {
        return NextResponse.json(
          {
            error:
              "That resident already has this call type on that date. Choose a different switch target.",
          },
          { status: 409 }
        );
      }

      throw new Error(`Failed updating call row: ${updateError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        call: updatedCall,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update call";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { callId } = await context.params;

    if (!callId) {
      return NextResponse.json({ error: "Missing call id" }, { status: 400 });
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const { data: existingCall, error: existingCallError } = await supabase
      .from("call_assignments")
      .select("id")
      .eq("id", callId)
      .eq("program_id", activeMembership.program_id)
      .single();

    if (existingCallError || !existingCall) {
      return NextResponse.json(
        { error: "Call assignment not found for this program" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("call_assignments")
      .delete()
      .eq("id", callId)
      .eq("program_id", activeMembership.program_id);

    if (deleteError) {
      throw new Error(`Failed deleting call row: ${deleteError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        deletedId: callId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete call";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}