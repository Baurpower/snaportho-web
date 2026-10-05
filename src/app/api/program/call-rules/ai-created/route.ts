import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  getProgramRules,
  getDefaultProgramRuleSet,
  prepareProgramRulesForReplacement,
} from "@/lib/workspace/call/programcallrules";
import {
  normalizeRuleForSave,
  mergeSingletonRuleIntoList,
  validateRuleDraft,
  type RuleDraft,
} from "@/lib/workspace/call/rule-definitions";
import { isProtectedProgramRuleType } from "@/lib/workspace/call/rule-persistence";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";
import { activatePolicyRevision, buildPolicyDocumentFromRules, createPolicyDraftRevision } from "@/lib/workspace/call/policy/policy-revisions";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 403 }
      );
    }

    await requireWorkspacePermission({
      userId: user.id,
      programId: membership.program_id,
      permission: "canManageCallRules",
    });

    const body = await request.json();

    const ruleSetId = String(body?.ruleSetId ?? "").trim();
    const previousRuleSetUpdatedAt = String(body?.previousRuleSetUpdatedAt ?? "").trim();
    const aiRule = body?.rule;

    if (!ruleSetId || !aiRule || !previousRuleSetUpdatedAt) {
      return NextResponse.json(
        { error: "ruleSetId, rule, and previousRuleSetUpdatedAt are required" },
        { status: 400 }
      );
    }

    // 1. Load existing rules for this set (so we can do singleton merge)
    const existingRules = await getProgramRules(membership.program_id, ruleSetId);

    // 2. Normalize through the canonical path (sanitizes config, validates type, etc.)
    let normalized;
    try {
      normalized = normalizeRuleForSave({
        type: aiRule.rule_type,
        name: aiRule.name ?? "AI-generated rule",
        enabled: true,
        isHardRule: Boolean(aiRule.is_hard_rule),
        config: aiRule.config ?? {},
      });
    } catch (normErr) {
      return NextResponse.json(
        {
          error: `Invalid AI rule: ${(normErr as Error).message}`,
        },
        { status: 400 }
      );
    }

    // 3. Run the same draft validation the editor uses
    const draftForValidation = {
      id: "ai-temp",
      name: normalized.name,
      type: normalized.type,
      enabled: normalized.enabled,
      isHardRule: normalized.isHardRule,
      config: normalized.config,
    };
    const validationErrors = validateRuleDraft(draftForValidation as RuleDraft);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: `AI rule failed validation: ${validationErrors.join("; ")}`,
        },
        { status: 400 }
      );
    }

    // 4. Merge using singleton semantics (replace existing of same type, never duplicate)
    const mergedList = mergeSingletonRuleIntoList(
      existingRules.filter((r) => !isProtectedProgramRuleType(r.rule_type)).map((r) => ({
        id: r.id,
        rule_type: r.rule_type,
        name: r.name,
        is_enabled: r.is_enabled,
        is_hard_rule: r.is_hard_rule,
        config: r.config,
        priority: r.priority,
      })),
      {
        type: normalized.type,
        name: normalized.name,
        enabled: normalized.enabled,
        isHardRule: normalized.isHardRule,
        config: normalized.config,
      }
    );

    // 5. Persist via the hardened replace path (full sanitization + safety guards already applied above)
    // We convert back to the Upsert shape the replace expects.
    const ruleSet = await getDefaultProgramRuleSet(membership.program_id);
    if (!ruleSet || ruleSet.id !== ruleSetId) {
      return NextResponse.json({ error: "Unknown rule set" }, { status: 404 });
    }
    const candidateRules = await prepareProgramRulesForReplacement({
      programId: membership.program_id,
      ruleSetId,
      userId: user.id,
      rules: mergedList.map((r, idx) => ({
        id: r.id,
        programId: membership.program_id!, // guarded by earlier !membership?.program_id check
        ruleSetId,
        ruleType: r.rule_type!,
        name: r.name!,
        isEnabled: r.is_enabled!,
        isHardRule: r.is_hard_rule!,
        priority: r.priority ?? (idx + 1) * 10,
        scope: (existingRules.find((er) => er.id === r.id)?.scope) ?? {},
        config: r.config ?? {},
      })),
    });
    const document = buildPolicyDocumentFromRules({ ruleSetId, ruleSetName: ruleSet.name, rules: candidateRules });
    const revision = await createPolicyDraftRevision({
      programId: membership.program_id,
      ruleSetId,
      actorUserId: user.id,
      document,
      legacyRules: existingRules,
      baseRuleSetUpdatedAt: previousRuleSetUpdatedAt,
      metadata: {
        source: "ai_rule_editor",
        explanation: aiRule.explanation ?? null,
        originalText: body.originalText ?? null,
      },
    });
    await activatePolicyRevision({
      programId: membership.program_id,
      ruleSetId,
      revisionId: revision.id,
      actorUserId: user.id,
      previousRuleSetUpdatedAt,
    });
    const savedRules = await getProgramRules(membership.program_id, ruleSetId);

    // Return the specific rule that was created/updated
    const resultingRule =
      savedRules.find((s) => s.rule_type === normalized.type) ?? savedRules[0];

    return NextResponse.json({ rule: resultingRule }, { status: 201 });
  } catch (error) {
    console.error("Failed to save AI-created rule", error);

    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && (error.message.includes("STALE_RULE_SET") || error.message.includes("STALE_POLICY_REVISION"))) {
      return NextResponse.json(
        { error: "Rule set has changed. Reload before saving again.", code: "STALE_RULE_SET" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save AI-created rule",
      },
      { status: 500 }
    );
  }
}
