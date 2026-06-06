import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  canManageProgramAttendings,
  createProgramAttending,
  listProgramAttendings,
  normalizeProgramAttendingInput,
} from "@/lib/workspace/call/attendings";

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

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        {
          programId: null,
          canManageAttendings: false,
          attendings: [],
        },
        { status: 200 }
      );
    }

    const permission = canManageProgramAttendings({
      rosterRole: membership.roster?.role ?? null,
      membershipRole: membership.role ?? null,
      isRosterAdmin: membership.roster?.isAdmin ?? false,
    });

    const attendings = await listProgramAttendings(membership.program_id);

    return NextResponse.json(
      {
        programId: membership.program_id,
        canManageAttendings: permission.canManage,
        attendings,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load attendings.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
        { error: "You do not have permission to manage attendings." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const input = normalizeProgramAttendingInput(body);

    if (!input) {
      return NextResponse.json(
        { error: "A valid fullName is required." },
        { status: 400 }
      );
    }

    const attending = await createProgramAttending({
      programId: membership.program_id,
      userId: user.id,
      input,
    });

    return NextResponse.json({ attending }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create attending.",
      },
      { status: 500 }
    );
  }
}
