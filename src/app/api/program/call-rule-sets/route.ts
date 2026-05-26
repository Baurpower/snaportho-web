import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  createProgramRuleSet,
  getDefaultProgramRuleSet,
  getProgramRuleSets,
} from "@/lib/workspace/call/programcallrules";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";

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
      return NextResponse.json({ ruleSets: [], defaultRuleSetId: null });
    }

    await requireWorkspacePermission({
      userId: user.id,
      programId: membership.program_id,
      permission: "canManageCallRules",
    });

    let ruleSets = await getProgramRuleSets(membership.program_id);
    let defaultRuleSet = await getDefaultProgramRuleSet(membership.program_id);

    if (!defaultRuleSet) {
      defaultRuleSet = await createProgramRuleSet({
        programId: membership.program_id,
        name: "Default Rules",
        description: "Default program call rules",
        isDefault: true,
        createdBy: user.id,
      });

      ruleSets = await getProgramRuleSets(membership.program_id);
    }

    return NextResponse.json({
      ruleSets,
      defaultRuleSetId: defaultRuleSet.id,
    });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load program rule sets",
      },
      { status: 500 }
    );
  }
}
