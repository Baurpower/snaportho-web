import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  getProgramRules,
  replaceProgramRulesForRuleSet,
} from "@/lib/workspace/call/programcallrules";
import {
  normalizeRuleForSave,
  mergeSingletonRuleIntoList,
  validateRuleDraft,
  type RuleDraft,
} from "@/lib/workspace/call/rule-definitions";

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

    const body = await request.json();

    const ruleSetId = String(body?.ruleSetId ?? "").trim();
    const aiRule = body?.rule;

    if (!ruleSetId || !aiRule) {
      return NextResponse.json(
        { error: "ruleSetId and rule are required" },
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
      existingRules.map((r) => ({
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
    const saved = await replaceProgramRulesForRuleSet({
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
        config: {
          ...(r.config ?? {}),
          // preserve / stamp AI provenance on the stored config
          ai_generated: true,
          ai_explanation: aiRule.explanation ?? null,
          original_text: body.originalText ?? null,
        },
      })),
    });

    // Return the specific rule that was created/updated
    const resultingRule = saved.find((s) => s.rule_type === normalized.type) ?? saved[0];

    return NextResponse.json({ rule: resultingRule }, { status: 201 });
  } catch (error) {
    console.error("Failed to save AI-created rule", error);

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