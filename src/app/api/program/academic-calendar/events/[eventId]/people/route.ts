import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import {
  getProgramIdForAcademicEvent,
  requireAcademicCalendarAccess,
} from "@/lib/workspace/academic-calendar/permissions";

const CreateAcademicEventPersonSchema = z.object({
  academic_event_session_id: z.string().uuid().nullable().optional(),
  roster_id: z.string().uuid().nullable().optional(),
  external_person_id: z.string().uuid().nullable().optional(),
  role: z.string().min(1).optional(),
  display_order: z.number().int().optional(),
});

const EVENT_PERSON_SELECT = `
  id,
  academic_event_id,
  academic_event_session_id,
  roster_id,
  external_person_id,
  role,
  display_order,
  created_at,
  roster_person:program_roster (
    id,
    first_name,
    last_name,
    full_name,
    grad_year,
    role,
    email
  ),
  external_person:external_people (
    id,
    first_name,
    last_name,
    full_name,
    credentials,
    institution
  )
`;

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

export async function GET(request: NextRequest, context: RouteContext) {
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
    .from("academic_event_people")
    .select(EVENT_PERSON_SELECT)
    .eq("academic_event_id", eventId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching academic event people:", error);
    return jsonError("Failed to fetch event people", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    return jsonError(access.error ?? "You do not have permission to edit academic events", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = CreateAcademicEventPersonSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const person = parsed.data;

  if (!person.roster_id && !person.external_person_id) {
    return jsonError("A roster person or external person is required", 400);
  }

  if (person.roster_id && person.external_person_id) {
    return jsonError(
      "Choose either a roster person or an external person, not both",
      400
    );
  }

  if (person.academic_event_session_id) {
    const { data: session, error: sessionError } = await supabase
      .from("academic_event_sessions")
      .select("id, academic_event_id")
      .eq("id", person.academic_event_session_id)
      .single();

    if (sessionError || !session) {
      return jsonError("Session not found", 404);
    }

    if (session.academic_event_id !== eventId) {
      return jsonError("Session does not belong to this event", 400);
    }
  }

  const { data, error } = await supabase
    .from("academic_event_people")
    .insert({
      academic_event_id: eventId,
      academic_event_session_id: person.academic_event_session_id ?? null,
      roster_id: person.roster_id ?? null,
      external_person_id: person.external_person_id ?? null,
      role: person.role ?? "presenter",
      display_order: person.display_order ?? 0,
    })
    .select(EVENT_PERSON_SELECT)
    .single();

  if (error) {
    console.error("Error creating academic event person:", error);
    return jsonError("Failed to assign event person", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}
