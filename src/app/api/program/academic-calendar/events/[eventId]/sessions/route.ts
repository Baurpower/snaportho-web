import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const CreateAcademicSessionSchema = z.object({
  title: z.string().min(1, "Session title is required"),
  session_type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  start_datetime: z.string().datetime().nullable().optional(),
  end_datetime: z.string().datetime().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  display_order: z.number().int().optional(),
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
    .from("academic_event_sessions")
    .select(`
      id,
      academic_event_id,
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
        address,
        building,
        room,
        is_virtual,
        virtual_url
      )
    `)
    .eq("academic_event_id", eventId)
    .order("display_order", { ascending: true })
    .order("start_datetime", { ascending: true });

  if (error) {
    console.error("Error fetching academic event sessions:", error);
    return jsonError("Failed to fetch sessions", 500);
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = CreateAcademicSessionSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const session = parsed.data;

  if (session.start_datetime && session.end_datetime) {
    const start = new Date(session.start_datetime);
    const end = new Date(session.end_datetime);

    if (end <= start) {
      return jsonError("Session end time must be after start time", 400);
    }
  }

  const { data, error } = await supabase
    .from("academic_event_sessions")
    .insert({
      academic_event_id: eventId,
      title: session.title,
      session_type: session.session_type ?? null,
      description: session.description ?? null,
      start_datetime: session.start_datetime ?? null,
      end_datetime: session.end_datetime ?? null,
      location_id: session.location_id ?? null,
      display_order: session.display_order ?? 0,
    })
    .select(`
      id,
      academic_event_id,
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
        address,
        building,
        room,
        is_virtual,
        virtual_url
      )
    `)
    .single();

  if (error) {
    console.error("Error creating academic event session:", error);
    return jsonError("Failed to create session", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}