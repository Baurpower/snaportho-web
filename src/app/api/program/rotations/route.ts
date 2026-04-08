import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RotationRow = {
  id: string;
  name: string | null;
  short_name: string | null;
  category: string | null;
  color: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

async function resolveProgramIdForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedProgramId: string | null
) {
  if (requestedProgramId) {
    const { data: membership, error } = await supabase
      .from("program_memberships")
      .select("program_id")
      .eq("user_id", userId)
      .eq("program_id", requestedProgramId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to verify requested program: ${error.message}`);
    }

    if (!membership?.program_id) {
      return null;
    }

    return membership.program_id as string;
  }

  const { data: membership, error } = await supabase
    .from("program_memberships")
    .select("program_id, is_active, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .not("program_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve user program: ${error.message}`);
  }

  return membership?.program_id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Failed to authenticate user: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to view program rotations." },
        { status: 401 }
      );
    }

    const requestedProgramId =
      request.nextUrl.searchParams.get("programId")?.trim() ?? null;

    const programId = await resolveProgramIdForUser(
      supabase,
      user.id,
      requestedProgramId
    );

    if (!programId) {
      return NextResponse.json(
        { error: "No accessible program found for this user." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("rotations")
      .select(
        `
          id,
          name,
          short_name,
          category,
          color,
          is_active,
          sort_order
        `
      )
      .eq("program_id", programId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch rotations: ${error.message}` },
        { status: 500 }
      );
    }

    const rotations: RotationRow[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? null,
      short_name: row.short_name ?? null,
      category: row.category ?? null,
      color: row.color ?? null,
      is_active: row.is_active ?? null,
      sort_order: row.sort_order ?? null,
    }));

    return NextResponse.json(
      {
        programId,
        rotations,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error loading program rotations.",
      },
      { status: 500 }
    );
  }
}