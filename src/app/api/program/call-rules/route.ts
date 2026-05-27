import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  getDefaultProgramRuleSet,
  getProgramRules,
  replaceProgramRulesForRuleSet,
} from "@/lib/workspace/call/programcallrules";
import { normalizeRuleForSave, getDefaultRuleScope } from "@/lib/workspace/call/rule-definitions";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";

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

    await requireWorkspacePermission({
      userId: user.id,
      programId: membership.program_id,
      permission: "canManageCallRules",
    });

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

    await requireWorkspacePermission({
      userId: user.id,
      programId: membership.program_id,
      permission: "canManageCallRules",
    });

    const body = await request.json();
    const ruleSetId = body?.ruleSetId as string | undefined;
    const rules = (body?.rules ?? []) as IncomingRule[];
    const previousRuleSetUpdatedAt = body?.previousRuleSetUpdatedAt as string | undefined; // Phase 7 staleness guard

    if (!ruleSetId) {
      return NextResponse.json(
        { error: "ruleSetId is required" },
        { status: 400 }
      );
    }

    // Phase 7: optional staleness protection using rule_set.updated_at
    if (previousRuleSetUpdatedAt) {
      const { data: currentSet } = await supabase
        .from("program_call_rule_sets")
        .select("updated_at")
        .eq("id", ruleSetId)
        .maybeSingle();

      if (currentSet?.updated_at && currentSet.updated_at !== previousRuleSetUpdatedAt) {
        return NextResponse.json(
          {
            error: "Rule set has been modified since you last loaded it. Please reload and try again.",
            code: "STALE_RULE_SET",
            currentUpdatedAt: currentSet.updated_at,
          },
          { status: 409 }
        );
      }
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

    // Phase 3: run every incoming rule through the canonical normalizer
    // so config shape, defaults, and sanitization are identical for manual + future AI paths.
    const normalized = rules.map((rule) =>
      normalizeRuleForSave({
        id: rule.id,
        type: rule.type,
        name: rule.name,
        enabled: rule.enabled,
        isHardRule: rule.isHardRule,
        config: rule.config,
      })
    );

    const saved = await replaceProgramRulesForRuleSet({
      programId: membership.program_id,
      ruleSetId,
      userId: user.id,
      rules: normalized.map((nr, index) => ({
        id: rules[index]?.id, // preserve original id for updates
        programId: membership.program_id!,
        ruleSetId,
        ruleType: nr.type,
        name: nr.name,
        isEnabled: nr.enabled,
        isHardRule: nr.isHardRule,
        priority: (index + 1) * 10,
        scope: getDefaultRuleScope(),
        config: nr.config,
      })),
    });

    // Bump the rule set's updated_at so that the staleness guard (previousRuleSetUpdatedAt)
    // actually protects against concurrent *rules* edits (not just metadata edits).
    // This makes the optimistic lock meaningful for the rules sheet without schema changes.
    const now = new Date().toISOString();
    await supabase
      .from("program_call_rule_sets")
      .update({ updated_at: now })
      .eq("id", ruleSetId)
      .eq("program_id", membership.program_id);

    return NextResponse.json({
      success: true,
      count: saved.length,
      rules: saved,
      ruleSetUpdatedAt: now, // so client can immediately refresh its local copy
    });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save call rules",
      },
      { status: 500 }
    );
  }
}
