import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import {
  getDefaultProgramRuleSet,
  getProgramRules,
  replaceProgramRulesForRuleSet,
} from "@/lib/db/programcallrules";

type IncomingRule = {
  id?: string;
  name: string;
  type: string;
  enabled: boolean;
  isHardRule: boolean;
  config?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const requestedRuleSetId = searchParams.get("ruleSetId");

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
      return NextResponse.json({ rules: [], ruleSetId: null });
    }

    let ruleSetId = requestedRuleSetId;

    if (!ruleSetId) {
      const defaultRuleSet = await getDefaultProgramRuleSet(membership.program_id);
      ruleSetId = defaultRuleSet?.id ?? null;
    }

    if (!ruleSetId) {
      return NextResponse.json({ rules: [], ruleSetId: null });
    }

    const rules = await getProgramRules(membership.program_id, ruleSetId);

    return NextResponse.json({ rules, ruleSetId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load call rules",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const ruleSetId = body?.ruleSetId as string | undefined;
    const rules = (body?.rules ?? []) as IncomingRule[];

    if (!ruleSetId) {
      return NextResponse.json(
        { error: "ruleSetId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "rules must be an array" }, { status: 400 });
    }

    const invalidRule = rules.find(
      (rule) =>
        !rule.name?.trim() ||
        !rule.type?.trim() ||
        typeof rule.enabled !== "boolean" ||
        typeof rule.isHardRule !== "boolean"
    );

    if (invalidRule) {
      return NextResponse.json(
        {
          error:
            "Each rule must include name, type, enabled, and isHardRule fields",
        },
        { status: 400 }
      );
    }

    const saved = await replaceProgramRulesForRuleSet({
      programId: membership.program_id,
      ruleSetId,
      userId: user.id,
      rules: rules.map((rule, index) => ({
        id: rule.id,
        programId: membership.program_id!,
        ruleSetId,
        ruleType: rule.type,
        name: rule.name,
        isEnabled: rule.enabled,
        isHardRule: rule.isHardRule,
        priority: (index + 1) * 10,
        scope: {},
        config: rule.config ?? {},
      })),
    });

    return NextResponse.json({
      success: true,
      count: saved.length,
      rules: saved,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save call rules",
      },
      { status: 500 }
    );
  }
}