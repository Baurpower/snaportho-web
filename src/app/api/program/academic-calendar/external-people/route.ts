import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const CreateExternalPersonSchema = z.object({
  program_id: z.string().uuid(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  full_name: z.string().min(1, "Full name is required"),
  credentials: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  institution: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  bio: z.string().nullable().optional(),
  headshot_url: z.string().url().nullable().optional(),
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

  const search = request.nextUrl.searchParams.get("search");

  let query = supabase
    .from("external_people")
    .select(`
      id,
      program_id,
      first_name,
      last_name,
      full_name,
      credentials,
      title,
      institution,
      email,
      bio,
      headshot_url,
      created_at,
      updated_at
    `)
    .eq("program_id", programId)
    .order("full_name", { ascending: true });

  if (search && search.trim()) {
    query = query.or(
      `full_name.ilike.%${search.trim()}%,institution.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching external people:", error);
    return jsonError("Failed to fetch external people", 500);
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

  const parsed = CreateExternalPersonSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid request",
      400
    );
  }

  const person = parsed.data;

  const { data, error } = await supabase
    .from("external_people")
    .insert({
      program_id: person.program_id,
      first_name: person.first_name ?? null,
      last_name: person.last_name ?? null,
      full_name: person.full_name.trim(),
      credentials: person.credentials ?? null,
      title: person.title ?? null,
      institution: person.institution ?? null,
      email: person.email ?? null,
      bio: person.bio ?? null,
      headshot_url: person.headshot_url ?? null,
    })
    .select(`
      id,
      program_id,
      first_name,
      last_name,
      full_name,
      credentials,
      title,
      institution,
      email,
      bio,
      headshot_url,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    console.error("Error creating external person:", error);
    return jsonError("Failed to create external person", 500);
  }

  return NextResponse.json({
    data,
    error: null,
  });
}