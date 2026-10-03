import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";
import { getDefaultProgramRuleSet } from "@/lib/workspace/call/programcallrules";
import { activatePolicyRevision } from "@/lib/workspace/call/policy/policy-revisions";

export async function POST(
  request: Request,
  context: { params: Promise<{ revisionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const membership = await getActiveMembershipForUser(user.id);
    if (!membership?.program_id) {
      return NextResponse.json({ error: "No active program membership found" }, { status: 400 });
    }
    await requireWorkspacePermission({
      userId: user.id,
      programId: membership.program_id,
      permission: "canManageCallRules",
    });
    const ruleSet = await getDefaultProgramRuleSet(membership.program_id);
    if (!ruleSet) return NextResponse.json({ error: "No default rule set exists" }, { status: 404 });
    const body = await request.json();
    if (body?.confirmation !== "ACTIVATE") {
      return NextResponse.json({ error: "Explicit activation confirmation is required" }, { status: 400 });
    }
    const { revisionId } = await context.params;
    const result = await activatePolicyRevision({
      programId: membership.program_id,
      ruleSetId: ruleSet.id,
      revisionId,
      actorUserId: user.id,
      previousRuleSetUpdatedAt: String(body.previousRuleSetUpdatedAt ?? ""),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Policy activation failed";
    return NextResponse.json(
      { error: message, code: message.includes("STALE_RULE_SET") ? "STALE_RULE_SET" : undefined },
      { status: message.includes("STALE_RULE_SET") ? 409 : 500 }
    );
  }
}
