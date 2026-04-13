import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

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

function isUniqueConstraintError(message: string) {
  return (
    message.includes("call_assignments_unique_membership_date_type") ||
    message.toLowerCase().includes("duplicate key value violates unique constraint")
  );
}

function buildSafeTemporaryDate() {
  const base = new Date();
  base.setUTCFullYear(base.getUTCFullYear() + 20);
  return base.toISOString().slice(0, 10);
}

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

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    const firstCallId =
      typeof body?.firstCallId === "string" ? body.firstCallId : null;
    const secondCallId =
      typeof body?.secondCallId === "string" ? body.secondCallId : null;

    if (!firstCallId || !secondCallId) {
      return NextResponse.json(
        { error: "firstCallId and secondCallId are required" },
        { status: 400 }
      );
    }

    if (firstCallId === secondCallId) {
      return NextResponse.json(
        { error: "Pick two different calls to swap" },
        { status: 400 }
      );
    }

    const { data: rows, error: rowsError } = await supabase
      .from("call_assignments")
      .select(
        "id, program_id, program_membership_id, call_type, call_date, start_datetime, end_datetime, site, is_home_call, notes"
      )
      .eq("program_id", activeMembership.program_id)
      .in("id", [firstCallId, secondCallId]);

    if (rowsError) {
      throw new Error(`Failed loading calls to swap: ${rowsError.message}`);
    }

    const firstCall = (rows ?? []).find((row) => row.id === firstCallId) as
      | CallAssignmentRow
      | undefined;
    const secondCall = (rows ?? []).find((row) => row.id === secondCallId) as
      | CallAssignmentRow
      | undefined;

    if (!firstCall || !secondCall) {
      return NextResponse.json(
        { error: "One or both calls were not found in this program" },
        { status: 404 }
      );
    }

    if (!firstCall.program_membership_id || !secondCall.program_membership_id) {
      return NextResponse.json(
        { error: "One or both calls are missing assigned residents" },
        { status: 400 }
      );
    }

    if (!firstCall.call_date || !secondCall.call_date) {
      return NextResponse.json(
        {
          error:
            "Quick swap currently requires both calls to have call_date values.",
        },
        { status: 400 }
      );
    }

    const tempDate = buildSafeTemporaryDate();

    const firstOriginal = {
      program_membership_id: firstCall.program_membership_id,
      call_date: firstCall.call_date,
    };

    const secondOriginal = {
      program_membership_id: secondCall.program_membership_id,
      call_date: secondCall.call_date,
    };

    const timestamp = new Date().toISOString();

    // Step 1: move first row out of the way to avoid unique constraint collision
    const { error: tempMoveError } = await supabase
      .from("call_assignments")
      .update({
        call_date: tempDate,
        updated_at: timestamp,
      })
      .eq("id", firstCall.id)
      .eq("program_id", activeMembership.program_id);

    if (tempMoveError) {
      throw new Error(`Failed preparing swap: ${tempMoveError.message}`);
    }

    // Step 2: move second row onto first resident/date
    const { error: updateSecondError } = await supabase
      .from("call_assignments")
      .update({
        program_membership_id: firstOriginal.program_membership_id,
        updated_at: timestamp,
      })
      .eq("id", secondCall.id)
      .eq("program_id", activeMembership.program_id);

    if (updateSecondError) {
      // best-effort rollback
      await supabase
        .from("call_assignments")
        .update({
          call_date: firstOriginal.call_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", firstCall.id);

      if (isUniqueConstraintError(updateSecondError.message)) {
        return NextResponse.json(
          {
            error:
              "Swap would create a duplicate resident/date/type combination.",
          },
          { status: 409 }
        );
      }

      throw new Error(`Failed swapping second call: ${updateSecondError.message}`);
    }

    // Step 3: put first row onto second resident/date
    const { error: finalizeFirstError } = await supabase
      .from("call_assignments")
      .update({
        program_membership_id: secondOriginal.program_membership_id,
        call_date: firstOriginal.call_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", firstCall.id)
      .eq("program_id", activeMembership.program_id);

    if (finalizeFirstError) {
      // best-effort rollback attempt
      await supabase
        .from("call_assignments")
        .update({
          program_membership_id: secondOriginal.program_membership_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", secondCall.id);

      await supabase
        .from("call_assignments")
        .update({
          program_membership_id: firstOriginal.program_membership_id,
          call_date: firstOriginal.call_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", firstCall.id);

      if (isUniqueConstraintError(finalizeFirstError.message)) {
        return NextResponse.json(
          {
            error:
              "Swap would create a duplicate resident/date/type combination.",
          },
          { status: 409 }
        );
      }

      throw new Error(`Failed finalizing swap: ${finalizeFirstError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        swapped: {
          firstCallId,
          secondCallId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to swap calls";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}