import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import {
  getProgramIdForAcademicEvent,
  requireAcademicCalendarAccess,
} from "@/lib/workspace/academic-calendar/permissions";

const AttendanceStatusSchema = z.enum([
  "required",
  "attending",
  "present",
  "absent",
  "excused",
  "late",
]);

const UpsertAttendanceSchema = z.object({
  roster_id: z.string().uuid(),
  status: AttendanceStatusSchema,
  checked_in_at: z.string().datetime().nullable().optional(),
  check_in_method: z.string().nullable().optional(),
  excuse_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const BulkUpsertAttendanceSchema = z.object({
  attendance: z.array(UpsertAttendanceSchema).min(1),
});

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      data: null,
      error: message,
    },
    { status }
  );
}

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized", 401);
  }

  const { eventId } = await context.params;

  const { programId, error: programLookupError } =
    await getProgramIdForAcademicEvent(supabase, eventId);

  if (programLookupError || !programId) {
    return jsonError("Academic event not found", 404);
  }

  const access = await requireAcademicCalendarAccess({
    supabase,
    userId: user.id,
    programId,
    level: "view",
  });

  if (!access.ok) {
    return jsonError(access.error ?? "You do not have access to this academic calendar", 403);
  }

  const { data, error } = await supabase
    .from("academic_event_attendance")
    .select(`
      id,
      academic_event_id,
      roster_id,
      status,
      checked_in_at,
      check_in_method,
      excuse_reason,
      notes,
      created_at,
      updated_at,
      roster:program_roster (
        id,
        first_name,
        last_name,
        full_name,
        role,
        grad_year
      )
    `)
    .eq("academic_event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching academic event attendance:", error);
    return jsonError("Failed to fetch attendance", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized", 401);
  }

  const { eventId } = await context.params;

  const { programId, error: programLookupError } =
    await getProgramIdForAcademicEvent(supabase, eventId);

  if (programLookupError || !programId) {
    return jsonError("Academic event not found", 404);
  }

  const access = await requireAcademicCalendarAccess({
    supabase,
    userId: user.id,
    programId,
    level: "edit",
  });

  if (!access.ok) {
    return jsonError(access.error ?? "You do not have permission to manage attendance", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = BulkUpsertAttendanceSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const rows = parsed.data.attendance.map((item) => ({
    academic_event_id: eventId,
    roster_id: item.roster_id,
    status: item.status,
    checked_in_at: item.checked_in_at ?? null,
    check_in_method: item.check_in_method ?? null,
    excuse_reason: item.excuse_reason ?? null,
    notes: item.notes ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("academic_event_attendance")
    .upsert(rows, {
      onConflict: "academic_event_id,roster_id",
    })
    .select(`
      id,
      academic_event_id,
      roster_id,
      status,
      checked_in_at,
      check_in_method,
      excuse_reason,
      notes,
      created_at,
      updated_at,
      roster:program_roster (
        id,
        first_name,
        last_name,
        full_name,
        role,
        grad_year
      )
    `);

  if (error) {
    console.error("Error upserting academic event attendance:", error);
    return jsonError("Failed to save attendance", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}
