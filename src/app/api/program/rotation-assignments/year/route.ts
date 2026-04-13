import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import {
  getProgramRotationAssignmentsInRange,
  type ProgramRotationAssignment,
} from "@/lib/db/rotations";

function getAcademicStartYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? year : year - 1;
}

function isValidAcademicYearStart(value: string | null): value is string {
  return !!value && /^\d{4}$/.test(value);
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
          programId: null,
          academicYearStart: null,
          academicYearLabel: null,
          rangeStart: null,
          rangeEnd: null,
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

    const assignments = await getProgramRotationAssignmentsInRange(
      activeMembership.program_id,
      rangeStart,
      rangeEnd
    );

    const normalizedAssignments = assignments
      .map((assignment: ProgramRotationAssignment) => ({
        id: assignment.id,
        membershipId: assignment.membershipId ?? null,
        rosterId: assignment.rosterId ?? null,
        memberName: assignment.memberName ?? null,
        gradYear: assignment.gradYear ?? null,
        role: assignment.role ?? null,
        userId: assignment.userId ?? null,
        startDate: assignment.startDate ?? null,
        endDate: assignment.endDate ?? null,
        siteLabel: assignment.siteLabel ?? null,
        teamLabel: assignment.teamLabel ?? null,
        notes: assignment.notes ?? null,
        rotation: assignment.rotation
          ? {
              id: assignment.rotation.id,
              name: assignment.rotation.name ?? null,
              short_name: assignment.rotation.short_name ?? null,
              category: assignment.rotation.category ?? null,
              color: assignment.rotation.color ?? null,
            }
          : null,
      }))
      .sort((a, b) => {
        const aName = a.memberName ?? "";
        const bName = b.memberName ?? "";
        if (aName !== bName) return aName.localeCompare(bName);

        const aStart = a.startDate ?? "";
        const bStart = b.startDate ?? "";
        if (aStart !== bStart) return aStart.localeCompare(bStart);

        const aEnd = a.endDate ?? "";
        const bEnd = b.endDate ?? "";
        return aEnd.localeCompare(bEnd);
      });

    return NextResponse.json(
      {
        programId: activeMembership.program_id,
        academicYearStart,
        academicYearLabel: `${academicYearStart}–${academicYearStart + 1}`,
        rangeStart,
        rangeEnd,
        assignments: normalizedAssignments,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load program rotation assignments",
      },
      { status: 500 }
    );
  }
}