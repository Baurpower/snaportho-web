import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";

type ExportScope = "mine" | "program";

type ProgramMembershipRelation = {
  id: string;
  display_name: string | null;
  user_id: string | null;
  program_id?: string | null;
};

type ProgramCallRow = {
  id: string;
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  site: string | null;
  is_home_call: boolean | null;
  notes: string | null;
  program_memberships: ProgramMembershipRelation | ProgramMembershipRelation[] | null;
};

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeMembership(
  value: ProgramCallRow["program_memberships"]
): ProgramMembershipRelation | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function escapeIcsText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatUtcDateTime(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatDateOnly(value: string) {
  return value.replace(/-/g, "");
}

function addOneDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function buildIcs(calls: ProgramCallRow[], options: { calendarName: string }) {
  const now = formatUtcDateTime(new Date().toISOString());

  const events = calls.map((call) => {
    const membership = normalizeMembership(call.program_memberships);
    const residentName = membership?.display_name ?? "Unknown Resident";

    const callType = call.call_type ?? "Call";
    const summary = `${callType}: ${residentName}`;

    const descriptionParts = [
      call.is_home_call ? "Home call" : null,
      call.notes ? `Notes: ${call.notes}` : null,
    ].filter(Boolean);

    const description = descriptionParts.join("\\n");

    const lines = [
      "BEGIN:VEVENT",
      `UID:${call.id}@snaportho-call`,
      `DTSTAMP:${now}`,
      `SUMMARY:${escapeIcsText(summary)}`,
    ];

    if (call.start_datetime && call.end_datetime) {
      lines.push(`DTSTART:${formatUtcDateTime(call.start_datetime)}`);
      lines.push(`DTEND:${formatUtcDateTime(call.end_datetime)}`);
    } else if (call.call_date) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(call.call_date)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addOneDay(call.call_date))}`);
    }

    if (call.site) {
      lines.push(`LOCATION:${escapeIcsText(call.site)}`);
    }

    if (description) {
      lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    }

    lines.push("END:VEVENT");

    return lines.join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SnapOrtho//Call Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const monthStart = searchParams.get("monthStart");
    const monthEnd = searchParams.get("monthEnd");
    const scope = (searchParams.get("scope") ?? "mine") as ExportScope;

    if (!isValidDateString(monthStart) || !isValidDateString(monthEnd)) {
      return NextResponse.json(
        { error: "monthStart and monthEnd are required in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (!["mine", "program"].includes(scope)) {
      return NextResponse.json(
        { error: "scope must be mine or program" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    if (scope === "program") {
      await requireWorkspacePermission({
        userId: user.id,
        programId: activeMembership.program_id,
        permission: "canExportProgramCallCalendar",
      });
    }

    const startIso = `${monthStart}T00:00:00.000Z`;
    const endIso = `${monthEnd}T23:59:59.999Z`;

    let timedQuery = supabase
      .from("call_assignments")
      .select(`
        id,
        program_membership_id,
        call_type,
        call_date,
        start_datetime,
        end_datetime,
        site,
        is_home_call,
        notes,
        program_memberships!inner (
          id,
          display_name,
          user_id,
          program_id
        )
      `)
      .eq("program_memberships.program_id", activeMembership.program_id)
      .not("start_datetime", "is", null)
      .lte("start_datetime", endIso)
      .gte("end_datetime", startIso);

    let dateOnlyQuery = supabase
      .from("call_assignments")
      .select(`
        id,
        program_membership_id,
        call_type,
        call_date,
        start_datetime,
        end_datetime,
        site,
        is_home_call,
        notes,
        program_memberships!inner (
          id,
          display_name,
          user_id,
          program_id
        )
      `)
      .eq("program_memberships.program_id", activeMembership.program_id)
      .is("start_datetime", null)
      .gte("call_date", monthStart)
      .lte("call_date", monthEnd);

    if (scope === "mine") {
      timedQuery = timedQuery.eq("program_membership_id", activeMembership.id);
      dateOnlyQuery = dateOnlyQuery.eq("program_membership_id", activeMembership.id);
    }

    const { data: timedCalls, error: timedError } = await timedQuery;
    if (timedError) throw new Error(timedError.message);

    const { data: dateOnlyCalls, error: dateOnlyError } = await dateOnlyQuery;
    if (dateOnlyError) throw new Error(dateOnlyError.message);

    const merged = [
      ...((timedCalls ?? []) as unknown as ProgramCallRow[]),
      ...((dateOnlyCalls ?? []) as unknown as ProgramCallRow[]),
    ];

    const deduped = Array.from(new Map(merged.map((row) => [row.id, row])).values());

    const ics = buildIcs(deduped, {
      calendarName: scope === "mine" ? "My SnapOrtho Call" : "Program SnapOrtho Call",
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scope}-call-${monthStart}-to-${monthEnd}.ics"`,
      },
    });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export call calendar",
      },
      { status: 500 }
    );
  }
}
