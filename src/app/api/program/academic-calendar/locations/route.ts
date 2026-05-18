import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const CreateAcademicLocationSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1, "Location name is required"),
  address: z.string().nullable().optional(),
  building: z.string().nullable().optional(),
  room: z.string().nullable().optional(),
  google_maps_url: z.string().url().nullable().optional(),
  is_virtual: z.boolean().optional(),
  virtual_url: z.string().url().nullable().optional(),
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

  const programId = request.nextUrl.searchParams.get("programId");

  if (!programId) {
    return jsonError("Missing programId", 400);
  }

  const { data, error } = await supabase
    .from("academic_locations")
    .select(`
      id,
      program_id,
      name,
      address,
      building,
      room,
      google_maps_url,
      is_virtual,
      virtual_url,
      notes,
      created_at,
      updated_at
    `)
    .eq("program_id", programId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching academic locations:", error);
    return jsonError("Failed to fetch locations", 500);
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

  const parsed = CreateAcademicLocationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const location = parsed.data;

  const { data, error } = await supabase
    .from("academic_locations")
    .insert({
      program_id: location.program_id,
      name: location.name.trim(),
      address: location.address ?? null,
      building: location.building ?? null,
      room: location.room ?? null,
      google_maps_url: location.google_maps_url ?? null,
      is_virtual: location.is_virtual ?? false,
      virtual_url: location.virtual_url ?? null,
      notes: location.notes ?? null,
    })
    .select(`
      id,
      program_id,
      name,
      address,
      building,
      room,
      google_maps_url,
      is_virtual,
      virtual_url,
      notes,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    console.error("Error creating academic location:", error);
    return jsonError("Failed to create location", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}