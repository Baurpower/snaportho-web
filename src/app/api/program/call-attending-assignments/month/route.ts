import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  canManageProgramAttendings,
  isValidMonthKey,
  listMonthAttendingAssignments,
  normalizeProgramAttendingMonthAssignments,
  upsertMonthAttendingAssignments,
} from "@/lib/workspace/call/attendings";

type UpdateBody = {
  month?: string;
  assignments?: unknown;
};

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

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        {
          programId: null,
          canManageAttendings: false,
          month: null,
          monthStart: null,
          monthEnd: null,
          attendings: [],
          assignments: [],
        },
        { status: 200 }
      );
    }

    const month = request.nextUrl.searchParams.get("month");

    if (!isValidMonthKey(month)) {
      return NextResponse.json(
        { error: "month is required in YYYY-MM format." },
        { status: 400 }
      );
    }

    const permission = canManageProgramAttendings({
      rosterRole: membership.roster?.role ?? null,
      membershipRole: membership.role ?? null,
      isRosterAdmin: membership.roster?.isAdmin ?? false,
    });

    const payload = await listMonthAttendingAssignments(membership.program_id, month);

    return NextResponse.json(
      {
        programId: membership.program_id,
        canManageAttendings: permission.canManage,
        ...payload,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load attending assignments.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found." },
        { status: 400 }
      );
    }

    const permission = canManageProgramAttendings({
      rosterRole: membership.roster?.role ?? null,
      membershipRole: membership.role ?? null,
      isRosterAdmin: membership.roster?.isAdmin ?? false,
    });

    if (!permission.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to save attending coverage." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as UpdateBody | null;
    const month = body?.month ?? null;

    if (!isValidMonthKey(month)) {
      return NextResponse.json(
        { error: "month is required in YYYY-MM format." },
        { status: 400 }
      );
    }

    const assignments = normalizeProgramAttendingMonthAssignments(
      body?.assignments,
      month
    );

    if (!assignments) {
      return NextResponse.json(
        {
          error:
            "assignments must be an array of { coverageDate, attendingId, coverageScope?, isDefault? } within the requested month.",
        },
        { status: 400 }
      );
    }

    const payload = await upsertMonthAttendingAssignments({
      programId: membership.program_id,
      month,
      userId: user.id,
      assignments,
    });

    return NextResponse.json(
      {
        programId: membership.program_id,
        canManageAttendings: true,
        ...payload,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save attending assignments.",
      },
      { status: 500 }
    );
  }
}
