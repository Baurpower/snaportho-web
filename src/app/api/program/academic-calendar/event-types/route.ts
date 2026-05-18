import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const CreateAcademicEventTypeSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1, "Event type name is required"),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  default_duration_minutes: z.number().int().positive().nullable().optional(),
  default_required: z.boolean().optional(),
  sort_order: z.number().int().optional(),
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

  const programId = request.nextUrl.searchParams.get("programId");

  if (!programId) {
    return jsonError("Missing programId", 400);
  }

  const { data, error } = await supabase
    .from("academic_event_types")
    .select(`
      id,
      program_id,
      name,
      color,
      icon,
      default_duration_minutes,
      default_required,
      sort_order,
      created_at,
      updated_at
    `)
    .eq("program_id", programId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching academic event types:", error);
    return jsonError("Failed to fetch event types", 500);
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

  const parsed = CreateAcademicEventTypeSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const eventType = parsed.data;

  const { data, error } = await supabase
    .from("academic_event_types")
    .insert({
      program_id: eventType.program_id,
      name: eventType.name.trim(),
      color: eventType.color ?? null,
      icon: eventType.icon ?? null,
      default_duration_minutes: eventType.default_duration_minutes ?? null,
      default_required: eventType.default_required ?? false,
      sort_order: eventType.sort_order ?? 0,
    })
    .select(`
      id,
      program_id,
      name,
      color,
      icon,
      default_duration_minutes,
      default_required,
      sort_order,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    console.error("Error creating academic event type:", error);

    if (error.code === "23505") {
      return jsonError("An event type with this name already exists", 409);
    }

    return jsonError("Failed to create event type", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}