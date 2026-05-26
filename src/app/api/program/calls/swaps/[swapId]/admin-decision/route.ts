import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { adminDecideSwapRequest } from "@/lib/workspace/call-swaps/service";
import { adminSwapDecisionSchema } from "@/lib/workspace/call-swaps/validation";
import { triggerGoogleCalendarReconciliation } from "@/lib/google/syncCallCalendarAfterChange";
import type { SwapPermissionContext } from "@/lib/workspace/call-swaps/types";

export const runtime = "nodejs";

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function createTraceId() {
  return `swap-approve-${crypto.randomUUID().slice(0, 8)}`;
}

function logTrace(traceId: string, label: string, details?: Record<string, unknown>) {
  if (!isDev()) return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[swap-approval:${traceId}] ${label}${payload}`);
}

async function timedStep<T>(
  traceId: string,
  label: string,
  work: () => Promise<T>
) {
  const startedAt = Date.now();
  logTrace(traceId, `${label}:start`);

  try {
    const result = await work();
    logTrace(traceId, `${label}:finish`, { durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logTrace(traceId, `${label}:error`, {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

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
  const traceId = createTraceId();
  const requestStartedAt = Date.now();

  try {
    logTrace(traceId, "api.route.received", {
      method: request.method,
      path: request.nextUrl.pathname,
    });

    const { swapId } = await timedStep(traceId, "api.route.resolve_params", async () => context.params);

    if (!swapId) {
      return NextResponse.json({ error: "Missing swap id." }, { status: 400 });
    }

    const supabase = await timedStep(traceId, "api.route.create_client", async () => createClient());

    const {
      data: { user },
      error: authError,
    } = await timedStep(traceId, "api.route.resolve_session", async () => supabase.auth.getUser());

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    logTrace(traceId, "api.route.user_resolved", { userId: user.id, swapId });

    const membership = await timedStep(traceId, "api.route.load_membership", async () =>
      getActiveMembershipForUser(user.id)
    );

    if (!membership?.program_id || !membership.roster_id) {
      return NextResponse.json({ error: "No active program context found." }, { status: 403 });
    }

    const body = await timedStep(traceId, "api.route.parse_body", async () =>
      request.json().catch(() => null)
    );
    const parsed = adminSwapDecisionSchema.safeParse({
      requestId: swapId,
      decision: body?.decision,
      adminNote: body?.note,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    logTrace(traceId, "api.route.permissions_checked", {
      programId: membership.program_id,
      rosterId: membership.roster_id,
      isRosterAdmin: membership.roster?.isAdmin ?? false,
      decision: parsed.data.decision,
    });

    const result = await timedStep(traceId, "api.route.admin_decision_service", async () =>
      adminDecideSwapRequest(
        createAdminClient(),
        buildPermissionContext(membership, user.id),
        parsed.data,
        { traceId }
      )
    );

    if (result.error || !result.data) {
      const status =
        result.error?.includes("not found")
          ? 404
          : result.error?.includes("permission")
          ? 403
          : 400;

      return NextResponse.json(
        { error: result.error ?? "Failed to process admin swap decision." },
        { status }
      );
    }

    if (parsed.data.decision === "approve") {
      const affectedUserIds = Array.from(
        new Set([
          user.id,
          result.data.requester?.claimedByUserId ?? null,
          result.data.recipient?.claimedByUserId ?? null,
        ].filter((value): value is string => Boolean(value)))
      );

      triggerGoogleCalendarReconciliation({
        userIds: affectedUserIds,
        programId: membership.program_id,
        affectedCallAssignmentIds: [
          result.data.requester_call_id,
          result.data.recipient_call_id,
        ].filter((value): value is string => Boolean(value)),
        source: `swap-admin-approval:${swapId}`,
      });
    }

    logTrace(traceId, "api.route.response_sent", {
      status: 200,
      totalDurationMs: Date.now() - requestStartedAt,
    });
    return NextResponse.json({ item: result.data }, { status: 200 });
  } catch (error) {
    logTrace(traceId, "api.route.error", {
      totalDurationMs: Date.now() - requestStartedAt,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process admin swap decision",
      },
      { status: 500 }
    );
  }
}
