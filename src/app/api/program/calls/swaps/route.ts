import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { canApproveSwapRequest } from "@/lib/workspace/call-swaps/permissions";
import {
  getAdminPendingSwapRequests,
  getIncomingSwapRequestsForUser,
  getOutgoingSwapRequestsForUser,
  getSwapRequestsForProgram,
} from "@/lib/workspace/call-swaps/queries";
import { createDirectSwapRequest } from "@/lib/workspace/call-swaps/service";
import { createSwapRequestSchema } from "@/lib/workspace/call-swaps/validation";
import type { SwapPermissionContext } from "@/lib/workspace/call-swaps/types";

function resolveListView(searchParams: URLSearchParams) {
  const explicitView = searchParams.get("view");
  if (explicitView) return explicitView;

  for (const key of ["incoming", "outgoing", "admin", "completed", "all"]) {
    if (searchParams.get(key) === "true") return key;
  }

  return "incoming";
}

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

    if (!membership?.program_id || !membership.roster_id) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const adminSupabase = createAdminClient();
    const context = buildPermissionContext(membership, user.id);
    const view = resolveListView(request.nextUrl.searchParams);
    const completedStatuses = ["approved", "rejected", "declined", "cancelled", "expired"] as const;

    if (view === "incoming") {
      const items = await getIncomingSwapRequestsForUser(
        adminSupabase,
        membership.roster_id
      );
      return NextResponse.json({ items }, { status: 200 });
    }

    if (view === "outgoing") {
      const items = await getOutgoingSwapRequestsForUser(
        adminSupabase,
        membership.roster_id
      );
      return NextResponse.json({ items }, { status: 200 });
    }

    if (view === "admin") {
      if (!canApproveSwapRequest(context).canApprove) {
        return NextResponse.json(
          { error: "You do not have permission to review pending swap requests." },
          { status: 403 }
        );
      }

      const items = await getAdminPendingSwapRequests(
        adminSupabase,
        membership.program_id
      );
      return NextResponse.json({ items }, { status: 200 });
    }

    if (view === "completed") {
      const baseItems = canApproveSwapRequest(context).canApprove
        ? await getSwapRequestsForProgram(adminSupabase, membership.program_id, {
            statuses: [...completedStatuses],
            includeExpired: true,
          })
        : [
            ...(await getIncomingSwapRequestsForUser(adminSupabase, membership.roster_id, {
              statuses: [...completedStatuses],
              includeExpired: true,
            })),
            ...(await getOutgoingSwapRequestsForUser(adminSupabase, membership.roster_id, {
              statuses: [...completedStatuses],
              includeExpired: true,
            })),
          ];

      const items = Array.from(new Map(baseItems.map((item) => [item.id, item])).values());
      return NextResponse.json({ items }, { status: 200 });
    }

    if (view === "all") {
      const baseItems = canApproveSwapRequest(context).canApprove
        ? await getSwapRequestsForProgram(adminSupabase, membership.program_id, {
            includeExpired: true,
          })
        : [
            ...(await getIncomingSwapRequestsForUser(adminSupabase, membership.roster_id, {
              includeExpired: true,
            })),
            ...(await getOutgoingSwapRequestsForUser(adminSupabase, membership.roster_id, {
              includeExpired: true,
            })),
          ];

      const items = Array.from(new Map(baseItems.map((item) => [item.id, item])).values());
      return NextResponse.json({ items }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid swap list view." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load swap requests",
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

    if (!membership?.program_id || !membership.roster_id) {
      return NextResponse.json(
        { error: "No active program roster context found." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    if (process.env.NODE_ENV !== "production") {
      console.info("[swap-create-debug] raw-body", {
        requestType: (body as Record<string, unknown>)?.requestType ?? "missing",
        requesterCallId: (body as Record<string, unknown>)?.requesterCallId ?? "missing",
        recipientRosterId: (body as Record<string, unknown>)?.recipientRosterId ?? "missing",
        recipientCallId: (body as Record<string, unknown>)?.recipientCallId ?? null,
        programId: (body as Record<string, unknown>)?.programId ?? "missing",
        requesterRosterId: (body as Record<string, unknown>)?.requesterRosterId ?? "missing",
      });
    }

    const parsed = createSwapRequestSchema.safeParse(body);

    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.info("[swap-create-debug] zod-parse-failed", {
          issues: parsed.error.issues,
        });
      }
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[swap-create-debug] parsed-ok", {
        requestType: parsed.data.requestType,
        requesterCallId: parsed.data.requesterCallId,
        recipientRosterId: parsed.data.recipientRosterId,
        recipientCallId: parsed.data.recipientCallId ?? null,
      });
    }

    if (parsed.data.programId !== membership.program_id) {
      return NextResponse.json(
        { error: "Swap request program does not match your active program." },
        { status: 403 }
      );
    }

    if (parsed.data.requesterRosterId !== membership.roster_id) {
      return NextResponse.json(
        { error: "Requester roster does not match your active roster." },
        { status: 403 }
      );
    }

    const result = await createDirectSwapRequest(
      createAdminClient(),
      buildPermissionContext(membership, user.id),
      parsed.data
    );

    if (result.error || !result.data) {
      return NextResponse.json(
        {
          error: result.error ?? "Failed to create swap request.",
          warnings: result.warnings ?? [],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        item: result.data,
        warnings: result.warnings ?? [],
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create swap request",
      },
      { status: 500 }
    );
  }
}
