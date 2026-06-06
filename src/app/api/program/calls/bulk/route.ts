import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  assertValidProgramCallMutationDraft,
  ProgramCallScheduleValidationError,
  ProgramCallValidationError,
  resolveProgramRosterTargets,
} from "@/lib/workspace/call/calls";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";
import type { CallValidationIssue } from "@/lib/workspace/call/validation";

type RuleViolationSummary = {
  ruleType: string;
  ruleName: string | null;
  residentName: string | null;
  rosterId: string | null;
  rotationName: string | null;
  callType: string | null;
  dates: string[];
  maxAllowed: number;
  message: string;
};

/**
 * Groups per-slot rotation_call_limit issues into one summary per
 * resident × rule × rotation, deduplicating dates.
 */
function buildRotationCallLimitViolations(
  issues: CallValidationIssue[]
): RuleViolationSummary[] {
  const limitIssues = issues.filter(
    (issue) => issue.code === "rotation_call_limit" && issue.severity === "error"
  );
  if (limitIssues.length === 0) return [];

  const grouped = new Map<string, RuleViolationSummary>();

  for (const issue of limitIssues) {
    const meta = (issue.metadata ?? {}) as Record<string, unknown>;
    const rotationName = (meta.rotationName as string | null) ?? null;
    const maxAllowed = typeof meta.maxCallDays === "number" ? meta.maxCallDays : 1;
    // residentName is now populated in metadata by validateRotationCallLimitRule.
    const residentName = (meta.residentName as string | null) ?? null;
    const groupKey = `${issue.rosterId ?? issue.residentId}__${issue.ruleCode}__${rotationName}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        ruleType: issue.ruleCode ?? "max_calls_for_rotation",
        ruleName: (meta.blockingRuleName as string | null) ?? null,
        residentName,
        rosterId: issue.rosterId ?? issue.residentId,
        rotationName,
        callType: issue.callType,
        dates: [],
        maxAllowed,
        message: issue.message,
      });
    }

    const summary = grouped.get(groupKey)!;
    if (issue.dateKey && !summary.dates.includes(issue.dateKey)) {
      summary.dates.push(issue.dateKey);
    }
    // If we get a non-null name later in the loop, fill it in.
    if (!summary.residentName && residentName) {
      summary.residentName = residentName;
    }
  }

  return Array.from(grouped.values()).map((s) => ({
    ...s,
    dates: s.dates.sort(),
  }));
}

type SaveRow = {
  residentName: string;
  callDate: string;
  callType: "Primary" | "Backup" | "Buddy";
  site?: string | null;
  isHomeCall?: boolean;
  notes?: string | null;
  matchedRosterId?: string | null;
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

    const access = await requireWorkspacePermission({
      userId: user.id,
      permission: "canUploadCallSchedule",
    });

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
        (!row.matchedRosterId && !row.matchedMembershipId) ||
        !row.residentName?.trim() ||
        !isValidDateString(row.callDate) ||
        !["Primary", "Backup", "Buddy"].includes(row.callType)
    );

    if (invalidRow) {
      return NextResponse.json(
        {
          error:
            "Every row must have a matchedRosterId (or legacy matchedMembershipId), residentName, valid callDate, and callType (Primary, Backup, or Buddy)",
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

    const resolvedTargets = await resolveProgramRosterTargets(
      access.accessContext.programId,
      rows.map((row) => ({
        rosterId: row.matchedRosterId ?? null,
        membershipId: row.matchedMembershipId ?? null,
      }))
    );

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
        .eq("program_id", access.accessContext.programId)
        .in("call_date", touchedDates);

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

    await assertValidProgramCallMutationDraft({
      programId: access.accessContext.programId,
      touchedDates,
      deleteCallIds: rowsToDelete,
      // Pass the full replacement range so the validation layer can correctly
      // identify which existing rows on non-touched dates will also be deleted,
      // enabling month-wide counting for max_calls_for_rotation rules.
      replaceExistingForDates: replaceExistingForDates.filter(isValidDateString),
      upserts: rows.map((row, index) => {
        const slotKey = `${row.callDate}__${row.callType}`;
        const existing = existingRowsBySlot.get(slotKey);
        const resolvedTarget = resolvedTargets[index];

        return {
          id: existing?.id ?? `bulk-${index}-${row.callDate}-${row.callType}`,
          rosterId: resolvedTarget.rosterId,
          programMembershipId: resolvedTarget.programMembershipId,
          callType: row.callType,
          callDate: row.callDate,
          startDatetime: null,
          endDatetime: null,
        };
      }),
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[call-validation-ui-path]", {
        endpoint: "/api/program/calls/bulk",
        programId: access.accessContext.programId,
        userId: user.id,
        incomingRowCount: rows.length,
        replaceExistingForDateCount: replaceExistingForDates.length,
        rowRosterIds: resolvedTargets.map((target) => target.rosterId),
        rowProgramMembershipIds: resolvedTargets.map(
          (target) => target.programMembershipId
        ),
        existingRowsConsidered: existingRowsBySlot.size,
        rowsToDeleteCount: rowsToDelete.length,
        source: "browser-save-validation",
        timestamp: new Date().toISOString(),
      });
    }

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

    for (const [index, row] of rows.entries()) {
      const slotKey = `${row.callDate}__${row.callType}`;
      const existing = existingRowsBySlot.get(slotKey);
      const resolvedTarget = resolvedTargets[index];

      const payload = {
        program_id: access.accessContext.programId,
        roster_id: resolvedTarget.rosterId,
        program_membership_id: resolvedTarget.programMembershipId,
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
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof ProgramCallScheduleValidationError) {
      // Hard rule violations from max_calls_for_rotation get a structured response
      // so the UI can show resident name, rotation, and exact dates rather than a
      // generic "validation failed" message.
      const ruleViolations = buildRotationCallLimitViolations(error.issues);

      if (ruleViolations.length > 0) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[bulk] CALL_RULE_VIOLATION", {
            count: ruleViolations.length,
            violations: ruleViolations.map((v) => ({
              rosterId: v.rosterId,
              rotationName: v.rotationName,
              dates: v.dates,
              maxAllowed: v.maxAllowed,
            })),
          });
        }

        return NextResponse.json(
          {
            error: "CALL_RULE_VIOLATION",
            message: "Schedule violates hard call rules.",
            violations: ruleViolations,
            // Also include the full validation payload so existing error-handling
            // paths continue to work if the caller prefers to use them.
            issues: error.issues,
            validation: error.validation,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Schedule validation failed",
          issues: error.issues,
          validation: error.validation,
        },
        { status: 400 }
      );
    }

    if (error instanceof ProgramCallValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save program calls",
      },
      { status: 500 }
    );
  }
}
