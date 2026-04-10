import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import { getRotationAssignmentsForMemberInRange } from "@/lib/db/rotations";
import { getCallAssignmentsForMembershipInRange } from "@/lib/db/calls";
import { getScheduleEventsForUserInRange } from "@/lib/db/schedule-events";
import { getProgramTimeOffMonth } from "@/lib/db/time-off";

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeRotationRow(
  rotation:
    | {
        id?: string | null;
        name?: string | null;
        short_name?: string | null;
        category?: string | null;
        color?: string | null;
      }
    | {
        id?: string | null;
        name?: string | null;
        short_name?: string | null;
        category?: string | null;
        color?: string | null;
      }[]
    | null
) {
  if (!rotation) return null;
  if (Array.isArray(rotation)) return rotation[0] ?? null;
  return rotation;
}

function getCurrentChiefGradYear(date = new Date()): number {
  const year = date.getFullYear();
  const julyFirst = new Date(year, 6, 1);
  return date >= julyFirst ? year + 1 : year;
}

function getPgyFromGradYear(
  gradYear: number | null,
  date = new Date()
): number | null {
  if (!gradYear) return null;
  const currentChiefGradYear = getCurrentChiefGradYear(date);
  const pgy = 5 - (gradYear - currentChiefGradYear);
  if (pgy < 1 || pgy > 5) return null;
  return pgy;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStart = searchParams.get("monthStart");
    const monthEnd = searchParams.get("monthEnd");

    if (!isValidDateString(monthStart) || !isValidDateString(monthEnd)) {
      return NextResponse.json(
        { error: "monthStart and monthEnd are required in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (monthStart > monthEnd) {
      return NextResponse.json(
        { error: "monthStart must be on or before monthEnd" },
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership) {
      return NextResponse.json(
        {
          monthStart,
          monthEnd,
          membership: null,
          rotations: [],
          calls: [],
          events: [],
          timeOff: [],
        },
        { status: 200 }
      );
    }

    const derivedPgyYear = getPgyFromGradYear(membership.grad_year ?? null);
    const derivedTrainingLevel = derivedPgyYear ? `PGY-${derivedPgyYear}` : null;

    const [rotations, calls, events, timeOffPayload] = await Promise.all([
      getRotationAssignmentsForMemberInRange(
        {
          membershipId: membership.id,
          rosterId: membership.roster_id ?? null,
        },
        monthStart,
        monthEnd
      ),
      getCallAssignmentsForMembershipInRange(
        membership.id,
        monthStart,
        monthEnd
      ),
      getScheduleEventsForUserInRange(user.id, monthStart, monthEnd),
      membership.program_id
        ? getProgramTimeOffMonth({
            programId: membership.program_id,
            monthStart,
            monthEnd,
            myMembershipId: membership.id,
          })
        : Promise.resolve({
            monthStart,
            monthEnd,
            myMembershipId: membership.id,
            items: [],
          }),
    ]);

    const myTimeOff = (timeOffPayload.items ?? []).filter(
      (item) => item.isMine || item.membershipId === membership.id
    );

    return NextResponse.json(
      {
        monthStart,
        monthEnd,
        membership: {
          id: membership.id,
          rosterId: membership.roster_id ?? null,
          displayName: membership.display_name ?? null,
          gradYear: membership.grad_year ?? null,
          pgyYear: derivedPgyYear,
          trainingLevel: derivedTrainingLevel,
        },
        rotations: rotations.map((item) => {
          const rotation = normalizeRotationRow(item.rotations);

          return {
            id: item.id,
            startDate: item.start_date,
            endDate: item.end_date,
            title:
              rotation?.short_name ??
              rotation?.name ??
              item.team_label ??
              item.site_label ??
              "Rotation",
            color: rotation?.color ?? null,
            siteLabel: item.site_label ?? null,
            teamLabel: item.team_label ?? null,
            notes: item.notes ?? null,
            rotation: rotation
              ? {
                  id: rotation.id ?? null,
                  name: rotation.name ?? null,
                  shortName: rotation.short_name ?? null,
                  category: rotation.category ?? null,
                  color: rotation.color ?? null,
                }
              : null,
          };
        }),
        calls: calls.map((item) => ({
          id: item.id,
          title: item.call_type ?? item.site ?? "Call",
          date: item.call_date ?? item.start_datetime?.slice(0, 10) ?? null,
          callType: item.call_type ?? null,
          startDatetime: item.start_datetime ?? null,
          endDatetime: item.end_datetime ?? null,
          site: item.site ?? null,
          isHomeCall: item.is_home_call ?? null,
          notes: item.notes ?? null,
        })),
        events: events.map((item) => ({
          id: item.id,
          title: item.title ?? item.category ?? "Event",
          date: item.event_date ?? null,
          category: item.category ?? null,
          startTime: item.start_time ?? null,
          endTime: item.end_time ?? null,
          isAllDay: item.is_all_day ?? null,
          location: item.location ?? null,
          description: item.description ?? null,
          attending: item.attending ?? null,
        })),
        timeOff: myTimeOff,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}