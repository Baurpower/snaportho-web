import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const UpdateAcademicEventSchema = z.object({
  title: z.string().min(1).optional(),
  event_type_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  start_datetime: z.string().datetime().optional(),
  end_datetime: z.string().datetime().optional(),
  location_id: z.string().uuid().nullable().optional(),
  is_required: z.boolean().optional(),
  visibility: z.enum(["program", "private", "public"]).optional(),
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

  const { data, error } = await supabase
    .from("academic_events")
    .select(`
      id,
      program_id,
      title,
      description,
      start_datetime,
      end_datetime,
      is_required,
      visibility,
      created_at,
      updated_at,

      event_type:academic_event_types (
        id,
        name,
        color,
        icon
      ),

      location:academic_locations (
        id,
        name,
        address,
        building,
        room,
        is_virtual,
        virtual_url
      ),

      sessions:academic_event_sessions (
        id,
        title,
        session_type,
        description,
        start_datetime,
        end_datetime,
        display_order,
        created_at,
        updated_at,

        location:academic_locations (
          id,
          name,
          room,
          building,
          is_virtual,
          virtual_url
        )
      ),

      people:academic_event_people (
  id,
  academic_event_id,
  academic_event_session_id,
  roster_id,
  external_person_id,
  role,
  display_order,

        roster:program_roster (
          id,
          first_name,
          last_name,
          full_name,
          role,
          grad_year
        ),

        external_person:external_people (
          id,
          first_name,
          last_name,
          full_name,
          credentials,
          institution
        )
      ),

      journal_articles:academic_journal_articles (
        id,
        title,
        journal,
        authors,
        publication_year,
        doi,
        pubmed_url,
        article_url,
        pdf_url,
        citation_text,
        summary,
        key_points,
        discussion_questions,
        display_order,
        created_at,
        updated_at
      ),

      resources:academic_event_resources (
        id,
        resource_type,
        title,
        url,
        file_path,
        description,
        display_order,
        created_at
      ),

      attendance:academic_event_attendance (
        id,
        status,
        checked_in_at,
        check_in_method,
        excuse_reason,
        notes,

        roster:program_roster (
          id,
          first_name,
          last_name,
          full_name,
          role,
          grad_year
        )
      ),

      assignments:academic_event_assignments (
        id,
        assignment_type,
        title,
        due_date,
        status,
        notes,
        created_at,

        roster:program_roster (
          id,
          first_name,
          last_name,
          full_name,
          role,
          grad_year
        )
      ),

      recurrence_rule:academic_event_recurrence_rules (
        id,
        recurrence_rule,
        recurrence_timezone,
        recurrence_end_date
      )
    `)
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Error fetching academic event:", error);
    return jsonError("Academic event not found", 404);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}

export async function PATCH(
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = UpdateAcademicEventSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const updates = parsed.data;

  if (
    updates.start_datetime &&
    updates.end_datetime
  ) {
    const start = new Date(updates.start_datetime);
    const end = new Date(updates.end_datetime);

    if (end <= start) {
      return jsonError(
        "Event end time must be after start time",
        400
      );
    }
  }

  const { data, error } = await supabase
    .from("academic_events")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select(`
      id,
      program_id,
      title,
      description,
      start_datetime,
      end_datetime,
      is_required,
      visibility,
      created_at,
      updated_at,

      event_type:academic_event_types (
        id,
        name,
        color,
        icon
      ),

      location:academic_locations (
        id,
        name,
        address,
        building,
        room,
        is_virtual,
        virtual_url
      )
    `)
    .single();

  if (error) {
    console.error("Error updating academic event:", error);
    return jsonError("Failed to update academic event", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}

export async function DELETE(
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

  const { error } = await supabase
    .from("academic_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("Error deleting academic event:", error);
    return jsonError("Failed to delete academic event", 500);
  }

  return NextResponse.json({
    data: {
      success: true,
    },
    error: null,
  });
}