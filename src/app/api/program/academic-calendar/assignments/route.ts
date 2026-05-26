import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { requireAcademicCalendarAccess } from "@/lib/workspace/academic-calendar/permissions";

const AssignmentStatusSchema = z.enum([
  "assigned",
  "in_progress",
  "completed",
  "excused",
  "cancelled",
]);

const CreateAcademicAssignmentSchema = z.object({
  academic_event_id: z.string().uuid(),
  academic_event_session_id: z.string().uuid().nullable().optional(),
  roster_id: z.string().uuid(),
  assignment_type: z.string().min(1, "Assignment type is required"),
  title: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  status: AssignmentStatusSchema.optional(),
  notes: z.string().nullable().optional(),
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

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized", 401);
  }

  const searchParams = request.nextUrl.searchParams;

  const programId = searchParams.get("programId");
  const eventId = searchParams.get("eventId");
  const sessionId = searchParams.get("sessionId");
  const rosterId = searchParams.get("rosterId");
  const status = searchParams.get("status");

  // Default behavior: only return assignments for the logged-in user's roster row.
  // Use mineOnly=false for admin/program-wide views.
  const mineOnly = searchParams.get("mineOnly") !== "false";

  if (programId) {
    const access = await requireAcademicCalendarAccess({
      supabase,
      userId: user.id,
      programId,
      level: "view",
    });

    if (!access.ok) {
      return jsonError(access.error ?? "You do not have access to this academic calendar", 403);
    }
  }

  let activeRosterId = rosterId;

  if (mineOnly && programId && !rosterId) {
    const { data: rosterRow, error: rosterError } = await supabase
      .from("program_roster")
      .select("id")
      .eq("program_id", programId)
      .eq("claimed_by_user_id", user.id)
      .single();

    if (rosterError || !rosterRow) {
      return NextResponse.json({
        data: [],
        error: null,
      });
    }

    activeRosterId = rosterRow.id;
  }

  let query = supabase
    .from("academic_event_assignments")
    .select(`
      id,
      academic_event_id,
      academic_event_session_id,
      roster_id,
      assignment_type,
      title,
      due_date,
      status,
      notes,
      created_at,
      updated_at,

      event:academic_events!inner (
        id,
        program_id,
        title,
        start_datetime,
        end_datetime
      ),

      session:academic_event_sessions (
        id,
        title,
        session_type,
        start_datetime,
        end_datetime
      ),

      roster:program_roster (
        id,
        first_name,
        last_name,
        full_name,
        role,
        grad_year
      )
    `)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (programId) {
    query = query.eq("event.program_id", programId);
  }

  if (eventId) {
    query = query.eq("academic_event_id", eventId);
  }

  if (sessionId) {
    query = query.eq("academic_event_session_id", sessionId);
  }

  if (activeRosterId) {
    query = query.eq("roster_id", activeRosterId);
  }

  if (status) {
    const parsedStatus = AssignmentStatusSchema.safeParse(status);

    if (!parsedStatus.success) {
      return jsonError("Invalid assignment status", 400);
    }

    query = query.eq("status", parsedStatus.data);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching academic assignments:", error);
    return jsonError("Failed to fetch assignments", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = CreateAcademicAssignmentSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const assignment = parsed.data;

  const { data: event, error: eventError } = await supabase
    .from("academic_events")
    .select("program_id")
    .eq("id", assignment.academic_event_id)
    .maybeSingle();

  if (eventError || !event?.program_id) {
    return jsonError("Academic event not found", 404);
  }

  const access = await requireAcademicCalendarAccess({
    supabase,
    userId: user.id,
    programId: event.program_id,
    level: "edit",
  });

  if (!access.ok) {
    return jsonError(access.error ?? "You do not have permission to manage academic assignments", 403);
  }

  const { data, error } = await supabase
    .from("academic_event_assignments")
    .insert({
      academic_event_id: assignment.academic_event_id,
      academic_event_session_id: assignment.academic_event_session_id ?? null,
      roster_id: assignment.roster_id,
      assignment_type: assignment.assignment_type,
      title: assignment.title ?? null,
      due_date: assignment.due_date ?? null,
      status: assignment.status ?? "assigned",
      notes: assignment.notes ?? null,
    })
    .select(`
      id,
      academic_event_id,
      academic_event_session_id,
      roster_id,
      assignment_type,
      title,
      due_date,
      status,
      notes,
      created_at,
      updated_at,

      event:academic_events (
        id,
        program_id,
        title,
        start_datetime,
        end_datetime
      ),

      session:academic_event_sessions (
        id,
        title,
        session_type,
        start_datetime,
        end_datetime
      ),

      roster:program_roster (
        id,
        first_name,
        last_name,
        full_name,
        role,
        grad_year
      )
    `)
    .single();

  if (error) {
    console.error("Error creating academic assignment:", error);
    return jsonError("Failed to create assignment", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}
