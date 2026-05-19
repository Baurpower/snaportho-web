import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { getWeekLiteForMembership } from "@/lib/workspace/call/week-lite";

type AcademicEventRow = {
  id: string;
  title: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  is_required: boolean | null;
  event_type:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
  location:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type WeekAcademicEvent = {
  id: string;
  title: string;
  eventTypeName: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  isRequired: boolean;
};

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getRelationName(
  relation:
    | { name: string | null }
    | { name: string | null }[]
    | null
    | undefined
) {
  if (!relation) return null;
  if (Array.isArray(relation)) return relation[0]?.name ?? null;
  return relation.name ?? null;
}

function toTimeValue(dateTime: string | null | undefined) {
  if (!dateTime) return null;

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupAcademicEventsByDate(events: AcademicEventRow[]) {
  const grouped = new Map<string, WeekAcademicEvent[]>();

  for (const event of events) {
    if (!event.start_datetime) continue;

    const dateKey = event.start_datetime.slice(0, 10);

    const mappedEvent: WeekAcademicEvent = {
      id: event.id,
      title: event.title ?? "Academic event",
      eventTypeName: getRelationName(event.event_type),
      startTime: toTimeValue(event.start_datetime),
      endTime: toTimeValue(event.end_datetime),
      location: getRelationName(event.location),
      isRequired: Boolean(event.is_required),
    };

    grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), mappedEvent]);
  }

  return grouped;
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get("weekStart");
    const weekEnd = searchParams.get("weekEnd");

    if (!isValidDateString(weekStart) || !isValidDateString(weekEnd)) {
      return NextResponse.json(
        { error: "weekStart and weekEnd are required in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (weekStart > weekEnd) {
      return NextResponse.json(
        { error: "weekStart must be on or before weekEnd" },
        { status: 400 }
      );
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership) {
      return NextResponse.json(
        { error: "No active membership found" },
        { status: 404 }
      );
    }

    const result = await getWeekLiteForMembership({
      membershipId: membership.id,
      rosterId: membership.roster_id ?? null,
      userId: user.id,
      weekStart,
      weekEnd,
    });

    const programId = membership.program_id;

    const { data: academicEvents, error: academicError } = await supabase
      .from("academic_events")
      .select(
        `
        id,
        title,
        start_datetime,
        end_datetime,
        is_required,
        event_type:academic_event_types(name),
        location:academic_locations(name)
      `
      )
      .eq("program_id", programId)
      .gte("start_datetime", `${weekStart}T00:00:00`)
      .lte("start_datetime", `${weekEnd}T23:59:59`)
      .order("start_datetime", { ascending: true });

    if (academicError) {
      throw new Error(`Failed to load academic events: ${academicError.message}`);
    }

    const academicEventsByDate = groupAcademicEventsByDate(
      (academicEvents ?? []) as AcademicEventRow[]
    );

    const enrichedResult = {
      ...result,
      days: (result.days ?? []).map((day) => ({
        ...day,
        academicEvents: academicEventsByDate.get(day.date) ?? [],
      })),
    };

    return NextResponse.json(enrichedResult, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}