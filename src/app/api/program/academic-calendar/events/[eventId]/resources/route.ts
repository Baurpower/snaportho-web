import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import {
  getProgramIdForAcademicEvent,
  requireAcademicCalendarAccess,
} from "@/lib/workspace/academic-calendar/permissions";

const ResourceTypeSchema = z.enum([
  "pdf",
  "slides",
  "article",
  "video",
  "website",
  "handout",
  "reading_assignment",
  "image",
  "other",
]);

const CreateAcademicResourceSchema = z.object({
  academic_event_session_id: z.string().uuid().nullable().optional(),
  resource_type: ResourceTypeSchema,
  title: z.string().min(1, "Resource title is required"),
  url: z.string().url().nullable().optional(),
  file_path: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
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
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  let query = supabase
    .from("academic_event_resources")
    .select(`
      id,
      academic_event_id,
      academic_event_session_id,
      resource_type,
      title,
      url,
      file_path,
      description,
      display_order,
      created_at,
      updated_at,
      uploaded_by_user_id
    `)
    .eq("academic_event_id", eventId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sessionId) {
    query = query.eq("academic_event_session_id", sessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching academic event resources:", error);
    return jsonError("Failed to fetch resources", 500);
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
    return jsonError(access.error ?? "You do not have permission to edit academic events", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = CreateAcademicResourceSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const resource = parsed.data;

  if (!resource.url && !resource.file_path) {
    return jsonError("Resource must include either a URL or file path", 400);
  }

  const { data, error } = await supabase
    .from("academic_event_resources")
    .insert({
      academic_event_id: eventId,
      academic_event_session_id: resource.academic_event_session_id ?? null,
      resource_type: resource.resource_type,
      title: resource.title,
      url: resource.url ?? null,
      file_path: resource.file_path ?? null,
      description: resource.description ?? null,
      uploaded_by_user_id: user.id,
      display_order: resource.display_order ?? 0,
    })
    .select(`
      id,
      academic_event_id,
      academic_event_session_id,
      resource_type,
      title,
      url,
      file_path,
      description,
      display_order,
      created_at,
      updated_at,
      uploaded_by_user_id
    `)
    .single();

  if (error) {
    console.error("Error creating academic event resource:", error);
    return jsonError("Failed to create resource", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}
