import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const today = getTodayDateString();

    const { data, error } = await supabase
      .from("program_memberships")
      .select(`
        id,
        program_id,
        is_active,
        start_date,
        end_date,
        programs (
          id,
          name,
          slug,
          institution_name,
          timezone,
          city,
          state
        )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("start_date", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch membership: ${error.message}` },
        { status: 500 }
      );
    }

    const memberships = Array.isArray(data) ? data : [];

    const activeMembership =
      memberships.find((row) => {
        const startsOk = !row.start_date || row.start_date <= today;
        const endsOk = !row.end_date || row.end_date >= today;
        return startsOk && endsOk;
      }) ?? null;

    if (!activeMembership) {
      return NextResponse.json({ program: null }, { status: 200 });
    }

    const rawProgram = Array.isArray(activeMembership.programs)
      ? activeMembership.programs[0] ?? null
      : activeMembership.programs ?? null;

    if (!rawProgram) {
      return NextResponse.json({ program: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        program: {
          id: rawProgram.id ?? null,
          name: rawProgram.name ?? null,
          slug: rawProgram.slug ?? null,
          institutionName: rawProgram.institution_name ?? null,
          timezone: rawProgram.timezone ?? null,
          city: rawProgram.city ?? null,
          state: rawProgram.state ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}