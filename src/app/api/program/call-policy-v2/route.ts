import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";
import {
  getDefaultProgramRuleSet,
  getProgramRules,
} from "@/lib/workspace/call/programcallrules";
import {
  buildPolicyDocumentFromRules,
  createPolicyDraftRevision,
  listPolicyRevisions,
} from "@/lib/workspace/call/policy/policy-revisions";
import {
  ControlledPolicyEditError,
  validateControlledPolicyDocumentEdit,
} from "@/lib/workspace/call/policy/controlled-authoring-v2";
import type { ProgramCallPolicyDocumentV2 } from "@/lib/workspace/call/policy/authoring-document-v2";

async function loadContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new WorkspacePermissionError("Not authenticated", 401);

  const membership = await getActiveMembershipForUser(user.id);
  if (!membership?.program_id) {
    throw new WorkspacePermissionError("No active program membership found", 400);
  }
  await requireWorkspacePermission({
    userId: user.id,
    programId: membership.program_id,
    permission: "canManageCallRules",
  });

  const ruleSet = await getDefaultProgramRuleSet(membership.program_id);
  if (!ruleSet) throw new Error("No default rule set exists");
  const rules = await getProgramRules(membership.program_id, ruleSet.id);
  const document = buildPolicyDocumentFromRules({
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    rules,
  });

  return { user, programId: membership.program_id, ruleSet, rules, document };
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspacePermissionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ControlledPolicyEditError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Call policy operation failed" },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const context = await loadContext();
    const revisions = await listPolicyRevisions(context.programId, context.ruleSet.id);
    return NextResponse.json({
      document: context.document,
      revisions,
      authoritativeSource: "legacy_rules",
      ruleSetUpdatedAt: context.ruleSet.updated_at,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await loadContext();
    const body = await request.json().catch(() => ({}));
    const requestedDocument = (body as { document?: ProgramCallPolicyDocumentV2 }).document;
    const document = requestedDocument
      ? validateControlledPolicyDocumentEdit({
          current: context.document,
          candidate: requestedDocument,
        })
      : context.document;
    const revision = await createPolicyDraftRevision({
      programId: context.programId,
      ruleSetId: context.ruleSet.id,
      actorUserId: context.user.id,
      document,
      legacyRules: context.rules,
    });
    return NextResponse.json({ revision, authoritativeSource: "legacy_rules" }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
