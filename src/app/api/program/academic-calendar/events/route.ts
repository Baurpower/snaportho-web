import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const CreateAcademicEventSchema = z.object({
  program_id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  event_type_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  start_datetime: z.string().datetime(),
  end_datetime: z.string().datetime(),
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
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const eventTypeId = searchParams.get("eventTypeId");
  const requiredOnly = searchParams.get("requiredOnly");

  if (!programId) {
    return jsonError("Missing programId", 400);
  }

  let query = supabase
    .from("academic_events")
    .select(
      `
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
    `
    )
    .eq("program_id", programId)
    .order("start_datetime", { ascending: true });

  if (startDate) {
    query = query.gte("start_datetime", startDate);
  }

  if (endDate) {
    query = query.lte("start_datetime", endDate);
  }

  if (eventTypeId) {
    query = query.eq("event_type_id", eventTypeId);
  }

  if (requiredOnly === "true") {
    query = query.eq("is_required", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching academic events:", error);
    return jsonError("Failed to fetch academic events", 500);
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

  const parsed = CreateAcademicEventSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const event = parsed.data;

  const startDate = new Date(event.start_datetime);
  const endDate = new Date(event.end_datetime);

  if (endDate <= startDate) {
    return jsonError("Event end time must be after start time", 400);
  }

  const { data, error } = await supabase
    .from("academic_events")
    .insert({
      program_id: event.program_id,
      title: event.title,
      event_type_id: event.event_type_id ?? null,
      description: event.description ?? null,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      location_id: event.location_id ?? null,
      is_required: event.is_required ?? false,
      visibility: event.visibility ?? "program",
      created_by_user_id: user.id,
    })
    .select(
      `
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
    `
    )
    .single();

  if (error) {
    console.error("Error creating academic event:", error);
    return jsonError("Failed to create academic event", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}