import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import { getProgramRotationAssignmentsInRange } from "@/lib/db/rotations";

type ProgramMemberRow = {
  id: string;
  display_name: string | null;
  grad_year: number | null;
  role: string | null;
  user_id: string | null;
  roster_id: string | null;
  is_active: boolean | null;
};

type RotationCatalogRow = {
  id: string;
  name: string | null;
  short_name: string | null;
  category: string | null;
  color: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type ProgramRow = {
  id: string;
  name: string | null;
  slug: string | null;
  institution_name: string | null;
  timezone: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean | null;
};

function getAcademicStartYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? year : year - 1;
}

function isValidAcademicYearStart(value: string | null): value is string {
  return !!value && /^\d{4}$/.test(value);
}

function getCurrentChiefGradYear(date = new Date()): number {
  const year = date.getFullYear();
  const julyFirst = new Date(year, 6, 1);
  return date >= julyFirst ? year + 1 : year;
}

function getPgyFromGradYear(
  gradYear: number | null,
  date = new Date()
): number | null {
  if (!gradYear) return null;

  const currentChiefGradYear = getCurrentChiefGradYear(date);
  const pgy = 5 - (gradYear - currentChiefGradYear);

  if (pgy < 1 || pgy > 5) return null;
  return pgy;
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
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        {
          program: null,
          academicYearStart: null,
          academicYearLabel: null,
          rangeStart: null,
          rangeEnd: null,
          members: [],
          rotations: [],
          assignments: [],
        },
        { status: 200 }
      );
    }

    const requestedAcademicYearStart =
      request.nextUrl.searchParams.get("academicYearStart");

    const academicYearStart = isValidAcademicYearStart(requestedAcademicYearStart)
      ? Number(requestedAcademicYearStart)
      : getAcademicStartYear();

    const rangeStart = `${academicYearStart}-07-01`;
    const rangeEnd = `${academicYearStart + 1}-06-30`;

    const [programResult, membersResult, rotationsResult, assignments] =
      await Promise.all([
        supabase
          .from("programs")
          .select(`
            id,
            name,
            slug,
            institution_name,
            timezone,
            city,
            state,
            is_active
          `)
          .eq("id", activeMembership.program_id)
          .maybeSingle(),

        supabase
          .from("program_memberships")
          .select(`
            id,
            display_name,
            grad_year,
            role,
            user_id,
            roster_id,
            is_active
          `)
          .eq("program_id", activeMembership.program_id)
          .eq("is_active", true)
          .order("grad_year", { ascending: true, nullsFirst: false })
          .order("display_name", { ascending: true }),

        supabase
          .from("rotations")
          .select(`
            id,
            name,
            short_name,
            category,
            color,
            is_active,
            sort_order
          `)
          .eq("program_id", activeMembership.program_id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("name", { ascending: true }),

        getProgramRotationAssignmentsInRange(
          activeMembership.program_id,
          rangeStart,
          rangeEnd
        ),
      ]);

    if (programResult.error) {
      throw new Error(`Failed to load program: ${programResult.error.message}`);
    }

    if (membersResult.error) {
      throw new Error(`Failed to load program members: ${membersResult.error.message}`);
    }

    if (rotationsResult.error) {
      throw new Error(`Failed to load rotations: ${rotationsResult.error.message}`);
    }

    const programRow = (programResult.data ?? null) as ProgramRow | null;

    const members = ((membersResult.data ?? []) as ProgramMemberRow[]).map((row) => {
      const pgyYear = getPgyFromGradYear(row.grad_year ?? null);

      return {
        membershipId: row.id,
        rosterId: row.roster_id ?? null,
        displayName: row.display_name ?? "Unknown",
        gradYear: row.grad_year ?? null,
        pgyYear,
        trainingLevel: pgyYear ? `PGY-${pgyYear}` : null,
        role: row.role ?? null,
        userId: row.user_id ?? null,
        isActive: row.is_active ?? null,
      };
    });

    const rotations = ((rotationsResult.data ?? []) as RotationCatalogRow[]).map((row) => ({
      id: row.id,
      name: row.name ?? null,
      shortName: row.short_name ?? null,
      category: row.category ?? null,
      color: row.color ?? null,
      isActive: row.is_active ?? null,
      sortOrder: row.sort_order ?? null,
    }));

    return NextResponse.json(
      {
        program: programRow
          ? {
              id: programRow.id,
              name: programRow.name ?? null,
              slug: programRow.slug ?? null,
              institutionName: programRow.institution_name ?? null,
              timezone: programRow.timezone ?? null,
              city: programRow.city ?? null,
              state: programRow.state ?? null,
            }
          : {
              id: activeMembership.program_id,
              name: null,
              slug: null,
              institutionName: null,
              timezone: null,
              city: null,
              state: null,
            },
        academicYearStart,
        academicYearLabel: `${academicYearStart}-${academicYearStart + 1}`,
        rangeStart,
        rangeEnd,
        members,
        rotations,
        assignments,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load program settings overview",
      },
      { status: 500 }
    );
  }
}