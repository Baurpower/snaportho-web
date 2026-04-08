import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

type SaveRow = {
  residentName: string;
  callDate: string;
  callType: "Primary" | "Backup";
  site?: string | null;
  isHomeCall?: boolean;
  notes?: string | null;
  matchedMembershipId?: string | null;
};

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
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

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const rows = (body?.rows ?? []) as SaveRow[];
    const replaceExistingForDates = Array.isArray(body?.replaceExistingForDates)
      ? (body.replaceExistingForDates as string[])
      : [];

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
    }

    const invalidRow = rows.find(
      (row) =>
        !row.matchedMembershipId ||
        !row.residentName?.trim() ||
        !isValidDateString(row.callDate) ||
        !["Primary", "Backup"].includes(row.callType)
    );

    if (invalidRow) {
      return NextResponse.json(
        {
          error:
            "Every row must have a matchedMembershipId, residentName, valid callDate, and callType",
        },
        { status: 400 }
      );
    }

    const duplicateSlot = rows.find((row, index) => {
      const key = `${row.callDate}__${row.callType}`;
      return rows.findIndex((r) => `${r.callDate}__${r.callType}` === key) !== index;
    });

    if (duplicateSlot) {
      return NextResponse.json(
        { error: "Only one resident may occupy each call slot per date/type" },
        { status: 400 }
      );
    }

    const membershipIds = Array.from(
      new Set(rows.map((row) => row.matchedMembershipId!).filter(Boolean))
    );

    if (membershipIds.length > 0) {
      const { data: validMemberships, error: validMembershipsError } = await supabase
        .from("program_memberships")
        .select("id")
        .eq("program_id", membership.program_id)
        .in("id", membershipIds);

      if (validMembershipsError) {
        throw new Error(
          `Failed to verify memberships: ${validMembershipsError.message}`
        );
      }

      const validMembershipIdSet = new Set((validMemberships ?? []).map((row) => row.id));

      const rowsOutsideProgram = rows.filter(
        (row) => !validMembershipIdSet.has(row.matchedMembershipId!)
      );

      if (rowsOutsideProgram.length > 0) {
        return NextResponse.json(
          { error: "One or more rows do not belong to this program" },
          { status: 400 }
        );
      }
    }

    const touchedDates = Array.from(
      new Set([
        ...replaceExistingForDates.filter(isValidDateString),
        ...rows.map((row) => row.callDate),
      ])
    );

    let existingRowsBySlot = new Map<
      string,
      { id: string; call_date: string | null; call_type: string | null }
    >();

    if (touchedDates.length > 0) {
      const { data: existingRows, error: existingRowsError } = await supabase
        .from("call_assignments")
        .select("id, call_date, call_type")
        .eq("program_id", membership.program_id)
        .in("call_date", touchedDates)
        .in("call_type", ["Primary", "Backup"]);

      if (existingRowsError) {
        throw new Error(`Failed loading existing slots: ${existingRowsError.message}`);
      }

      existingRowsBySlot = new Map(
        (existingRows ?? []).map((row) => [
          `${row.call_date}__${row.call_type}`,
          row,
        ])
      );
    }

    const incomingSlotKeys = new Set(
      rows.map((row) => `${row.callDate}__${row.callType}`)
    );

    const rowsToDelete = Array.from(existingRowsBySlot.entries())
      .filter(([slotKey, row]) => {
        if (!row.call_date || !replaceExistingForDates.includes(row.call_date)) {
          return false;
        }
        return !incomingSlotKeys.has(slotKey);
      })
      .map(([, row]) => row.id);

    if (rowsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("call_assignments")
        .delete()
        .in("id", rowsToDelete);

      if (deleteError) {
        throw new Error(`Failed deleting cleared slots: ${deleteError.message}`);
      }
    }

    const saved: Array<{ action: "created" | "updated"; id: string }> = [];

    for (const row of rows) {
      const slotKey = `${row.callDate}__${row.callType}`;
      const existing = existingRowsBySlot.get(slotKey);

      const payload = {
        program_id: membership.program_id,
        program_membership_id: row.matchedMembershipId!,
        call_type: row.callType,
        call_date: row.callDate,
        start_datetime: null,
        end_datetime: null,
        site: row.site ?? null,
        is_home_call: row.isHomeCall ?? false,
        notes: row.notes ?? null,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("call_assignments")
          .update(payload)
          .eq("id", existing.id);

        if (updateError) {
          throw new Error(`Failed updating call row: ${updateError.message}`);
        }

        saved.push({ action: "updated", id: existing.id });
      } else {
        const { data: created, error: insertError } = await supabase
          .from("call_assignments")
          .insert(payload)
          .select("id")
          .single();

        if (insertError) {
          throw new Error(`Failed inserting call row: ${insertError.message}`);
        }

        saved.push({ action: "created", id: created.id });
      }
    }

    return NextResponse.json(
      {
        success: true,
        created: saved.filter((item) => item.action === "created").length,
        updated: saved.filter((item) => item.action === "updated").length,
        deleted: rowsToDelete.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save program calls",
      },
      { status: 500 }
    );
  }
}