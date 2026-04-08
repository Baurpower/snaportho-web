import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import {
  createProgramRuleSet,
  getDefaultProgramRuleSet,
  getProgramRuleSets,
} from "@/lib/db/programcallrules";

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