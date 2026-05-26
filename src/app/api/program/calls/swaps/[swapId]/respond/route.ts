import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { respondToSwapRequestSchema } from "@/lib/workspace/call-swaps/validation";
import { respondToSwapRequest } from "@/lib/workspace/call-swaps/service";
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

export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = await request.json().catch(() => null);
    const parsed = respondToSwapRequestSchema.safeParse({
      requestId: swapId,
      decision: body?.decision,
      recipientNote: body?.note,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    const result = await respondToSwapRequest(
      createAdminClient(),
      buildPermissionContext(membership, user.id),
      parsed.data
    );

    if (result.error || !result.data) {
      const status =
        result.error?.includes("not found")
          ? 404
          : result.error?.includes("permission")
          ? 403
          : 400;

      return NextResponse.json(
        { error: result.error ?? "Failed to respond to swap request." },
        { status }
      );
    }

    return NextResponse.json({ item: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to respond to swap request",
      },
      { status: 500 }
    );
  }
}
