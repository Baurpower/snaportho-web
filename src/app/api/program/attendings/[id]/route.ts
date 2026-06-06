import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  canManageProgramAttendings,
  deactivateProgramAttending,
  updateProgramAttending,
} from "@/lib/workspace/call/attendings";

type UpdateBody = {
  fullName?: string;
  displayName?: string | null;
  isActive?: boolean;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as UpdateBody | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "A valid payload is required." }, { status: 400 });
    }

    const attending =
      body.isActive === false &&
      body.fullName === undefined &&
      body.displayName === undefined
        ? await deactivateProgramAttending({
            programId: membership.program_id,
            attendingId: id,
            userId: user.id,
          })
        : await updateProgramAttending({
            programId: membership.program_id,
            attendingId: id,
            userId: user.id,
            input: body,
          });

    return NextResponse.json({ attending }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update attending.";
    const status = message === "Program attending not found." ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
