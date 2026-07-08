import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";
import {
  createTimeOffEvent,
  type TimeOffType,
} from "@/lib/workspace/call/time-off";

type BatchRowInput = {
  id?: string | null;
  rosterId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  eventType?: string | null;
  notes?: string | null;
};

type RosterRow = {
  id: string;
  program_membership_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  grad_year: number | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  active_start_date: string | null;
  active_end_date: string | null;
};

type ExistingTimeOffRow = {
  id: string;
  roster_id: string | null;
  event_type: string | null;
  start_date: string | null;
  end_date: string | null;
  approval_status: string | null;
  title: string | null;
};

type CallRow = {
  id: string;
  roster_id: string | null;
  call_date: string | null;
  call_type: string | null;
};

type RotationRow = {
  id: string;
  roster_id: string | null;
  start_date: string | null;
  end_date: string | null;
  site_label: string | null;
  team_label: string | null;
};

const VALID_TYPES = new Set<TimeOffType>([
  "personal",
  "conference",
  "vacation",
  "sick",
  "other",
]);

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T00:00:00`);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function getDisplayName(row: RosterRow) {
  return (
    row.full_name ||
    [row.first_name, row.last_name].filter(Boolean).join(" ") ||
    "Unknown Resident"
  );
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string | null,
  bEnd: string | null
) {
  if (!bStart || !bEnd) return false;
  return aStart <= bEnd && aEnd >= bStart;
}

function dateWithinRange(dateKey: string | null, startDate: string, endDate: string) {
  return Boolean(dateKey && dateKey >= startDate && dateKey <= endDate);
}

function isResidentActiveForRange(
  resident: RosterRow,
  startDate: string,
  endDate: string
) {
  const status = getResidentStatusDetails(resident.grad_year ?? null, startDate);
  if (!status.isActiveResident) return false;
  if (resident.is_active === false) return false;

  const rosterStart = resident.start_date ?? resident.active_start_date ?? null;
  const rosterEnd = resident.end_date ?? resident.active_end_date ?? null;

  if (rosterStart && rosterStart > endDate) return false;
  if (rosterEnd && rosterEnd < startDate) return false;

  return true;
}

function normalizeNotes(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

    const access = await requireWorkspacePermission({
      userId: user.id,
      permission: "canUploadTimeOff",
    });

    const body = await request.json().catch(() => null);
    const rows = Array.isArray(body?.rows) ? (body.rows as BatchRowInput[]) : [];

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
    }

    const programId = access.accessContext.programId;
    const rowResults = rows.map((row, index) => ({
      rowId: row.id ?? `row-${index + 1}`,
      index,
      status: "pending" as "pending" | "created" | "skipped" | "error",
      created: false,
      skipped: false,
      eventId: null as string | null,
      errors: [] as string[],
      warnings: [] as string[],
      info: ["Saved rows are approved admin entries.", "No notifications sent."],
    }));

    const rosterIds = Array.from(
      new Set(
        rows
          .map((row) => (typeof row.rosterId === "string" ? row.rosterId : null))
          .filter(Boolean)
      )
    ) as string[];

    const rosterById = new Map<string, RosterRow>();

    if (rosterIds.length > 0) {
      const { data: rosterRows, error: rosterError } = await supabase
        .from("program_roster")
        .select(
          "id, program_membership_id, full_name, first_name, last_name, grad_year, is_active, start_date, end_date, active_start_date, active_end_date"
        )
        .eq("program_id", programId)
        .in("id", rosterIds);

      if (rosterError) {
        throw new Error(`Failed to load roster rows: ${rosterError.message}`);
      }

      for (const row of (rosterRows ?? []) as RosterRow[]) {
        rosterById.set(row.id, row);
      }
    }

    const seenBatchKeys = new Set<string>();
    let minDate: string | null = null;
    let maxDate: string | null = null;

    rows.forEach((row, index) => {
      const result = rowResults[index];
      const rosterId = typeof row.rosterId === "string" ? row.rosterId : "";
      const startDate = row.startDate ?? "";
      const endDate = row.endDate ?? "";
      const eventType = row.eventType ?? "";

      if (!rosterId) {
        result.errors.push("Resident is required.");
      } else if (!rosterById.has(rosterId)) {
        result.errors.push("Resident does not belong to this program.");
      }

      if (!startDate) {
        result.errors.push("Start date is required.");
      } else if (!isDateKey(startDate)) {
        result.errors.push("Start date must be a valid YYYY-MM-DD date.");
      }

      if (!endDate) {
        result.errors.push("End date is required.");
      } else if (!isDateKey(endDate)) {
        result.errors.push("End date must be a valid YYYY-MM-DD date.");
      }

      if (isDateKey(startDate) && isDateKey(endDate) && endDate < startDate) {
        result.errors.push("End date cannot be before start date.");
      }

      if (!VALID_TYPES.has(eventType as TimeOffType)) {
        result.errors.push("Type is required.");
      }

      const resident = rosterById.get(rosterId);
      if (
        resident &&
        isDateKey(startDate) &&
        isDateKey(endDate) &&
        !isResidentActiveForRange(resident, startDate, endDate)
      ) {
        result.errors.push(`${getDisplayName(resident)} is inactive or graduated for this date range.`);
      }

      if (
        rosterId &&
        isDateKey(startDate) &&
        isDateKey(endDate) &&
        VALID_TYPES.has(eventType as TimeOffType)
      ) {
        const key = `${rosterId}|${startDate}|${endDate}|${eventType}`;
        if (seenBatchKeys.has(key)) {
          result.errors.push("Duplicate row in current table.");
        } else {
          seenBatchKeys.add(key);
        }

        minDate = minDate && minDate < startDate ? minDate : startDate;
        maxDate = maxDate && maxDate > endDate ? maxDate : endDate;
      }
    });

    let existingTimeOffRows: ExistingTimeOffRow[] = [];
    let callRows: CallRow[] = [];
    let rotationRows: RotationRow[] = [];

    if (minDate && maxDate) {
      const [timeOffResult, callsResult, rotationsResult] = await Promise.all([
        supabase
          .from("availability_events")
          .select("id, roster_id, event_type, start_date, end_date, approval_status, title")
          .eq("program_id", programId)
          .neq("approval_status", "denied")
          .lte("start_date", maxDate)
          .gte("end_date", minDate),
        supabase
          .from("call_assignments")
          .select("id, roster_id, call_date, call_type")
          .eq("program_id", programId)
          .gte("call_date", minDate)
          .lte("call_date", maxDate),
        supabase
          .from("rotation_assignments")
          .select("id, roster_id, start_date, end_date, site_label, team_label")
          .eq("program_id", programId)
          .lte("start_date", maxDate)
          .gte("end_date", minDate),
      ]);

      if (timeOffResult.error) {
        throw new Error(`Failed to load existing time off: ${timeOffResult.error.message}`);
      }
      if (callsResult.error) {
        throw new Error(`Failed to load call assignments: ${callsResult.error.message}`);
      }
      if (rotationsResult.error) {
        throw new Error(`Failed to load rotations: ${rotationsResult.error.message}`);
      }

      existingTimeOffRows = (timeOffResult.data ?? []) as ExistingTimeOffRow[];
      callRows = (callsResult.data ?? []) as CallRow[];
      rotationRows = (rotationsResult.data ?? []) as RotationRow[];
    }

    rows.forEach((row, index) => {
      const result = rowResults[index];
      if (result.errors.length > 0) return;

      const rosterId = row.rosterId!;
      const startDate = row.startDate!;
      const endDate = row.endDate!;
      const eventType = row.eventType!;

      const overlapsExistingTimeOff = existingTimeOffRows.some(
        (existing) =>
          existing.roster_id === rosterId &&
          rangesOverlap(startDate, endDate, existing.start_date, existing.end_date)
      );

      if (overlapsExistingTimeOff) {
        result.warnings.push("Overlaps existing time off.");
      }

      const duplicateExistingEvent = existingTimeOffRows.some(
        (existing) =>
          existing.roster_id === rosterId &&
          existing.event_type === eventType &&
          existing.start_date === startDate &&
          existing.end_date === endDate
      );

      if (duplicateExistingEvent) {
        result.warnings.push("Existing duplicate event will be skipped.");
      }

      if (callRows.some((call) => call.roster_id === rosterId && dateWithinRange(call.call_date, startDate, endDate))) {
        result.warnings.push("Overlaps a call assignment.");
      }

      if (
        rotationRows.some(
          (rotation) =>
            rotation.roster_id === rosterId &&
            rangesOverlap(startDate, endDate, rotation.start_date, rotation.end_date)
        )
      ) {
        result.warnings.push("Overlaps a rotation.");
      }

      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      const cursor = new Date(start);
      while (cursor <= end) {
        const day = cursor.getDay();
        if (day === 0 || day === 6) {
          result.info.push("Weekend days included.");
          break;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    for (const [index, row] of rows.entries()) {
      const result = rowResults[index];

      if (result.errors.length > 0) {
        result.status = "error";
        result.skipped = true;
        continue;
      }

      const roster = rosterById.get(row.rosterId!);
      if (!roster) {
        result.status = "error";
        result.skipped = true;
        result.errors.push("Resident does not belong to this program.");
        continue;
      }

      const created = await createTimeOffEvent({
        programId,
        rosterId: roster.id,
        membershipId: roster.program_membership_id ?? null,
        createdByUserId: user.id,
        eventType: row.eventType as TimeOffType,
        usingPto: row.eventType === "vacation" || row.eventType === "personal",
        sourceKind: "admin_entry",
        constraintLevel: "hard",
        title: null,
        notes: normalizeNotes(row.notes),
        location: null,
        startDate: row.startDate!,
        endDate: row.endDate!,
        approvalStatus: "approved",
      });

      result.eventId = created.event.id;
      result.created = created.created;
      result.skipped = !created.created;
      result.status = created.created ? "created" : "skipped";

      if (!created.created && !result.warnings.includes("Existing duplicate event will be skipped.")) {
        result.warnings.push("Existing duplicate event was skipped.");
      }
    }

    const createdCount = rowResults.filter((row) => row.created).length;
    const skippedCount = rowResults.filter((row) => row.skipped).length;
    const errors = rowResults.flatMap((row) =>
      row.errors.map((message) => ({ rowId: row.rowId, message }))
    );
    const warnings = rowResults.flatMap((row) =>
      row.warnings.map((message) => ({ rowId: row.rowId, message }))
    );

    return NextResponse.json(
      {
        created: createdCount,
        skipped: skippedCount,
        errors,
        warnings,
        rowResults,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save admin time-off entries",
      },
      { status: 500 }
    );
  }
}
