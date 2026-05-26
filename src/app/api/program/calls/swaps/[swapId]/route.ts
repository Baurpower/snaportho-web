import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { canViewSwapRequest } from "@/lib/workspace/call-swaps/permissions";
import {
  getSwapAuditLogForRequest,
  getSwapRequestWithDetailsById,
} from "@/lib/workspace/call-swaps/queries";
import type { SwapPermissionContext } from "@/lib/workspace/call-swaps/types";

type RouteContext = {
  params: Promise<{
    swapId: string;
  }>;
};

function buildPermissionContext(membership: Awaited<ReturnType<typeof getActiveMembershipForUser>>, userId: string): SwapPermissionContext {
  return {
    userId,
    programId: membership?.program_id ?? null,
    membershipId: membership?.id ?? null,
    membershipRole: membership?.role ?? null,
    rosterId: membership?.roster_id ?? null,
    rosterRole: membership?.roster?.role ?? null,
    isRosterAdmin: membership?.roster?.isAdmin ?? false,
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { swapId } = await context.params;

    if (!swapId) {
      return NextResponse.json({ error: "Missing swap id." }, { status: 400 });
    }

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

    if (!membership?.program_id || !membership.roster_id) {
      return NextResponse.json({ error: "No active program context found." }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const item = await getSwapRequestWithDetailsById(adminSupabase, swapId);

    if (!item) {
      return NextResponse.json({ error: "Swap request not found." }, { status: 404 });
    }

    if (!canViewSwapRequest(buildPermissionContext(membership, user.id), item)) {
      return NextResponse.json(
        { error: "You do not have access to this swap request." },
        { status: 403 }
      );
    }

    const auditLog = await getSwapAuditLogForRequest(adminSupabase, swapId);

    return NextResponse.json(
      {
        item,
        auditLog,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load swap request",
      },
      { status: 500 }
    );
  }
}
