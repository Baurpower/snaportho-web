import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDefaultRuleScope } from "./rule-definitions";
import { migratePersistedCallRules } from "./persisted-rule-migration";
import { mergeEditableRulesWithProtectedRows } from "./rule-persistence";

export type ProgramCallRuleSet = {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramCallRule = {
  id: string;
  program_id: string;
  rule_set_id: string;
  rule_type: string;
  name: string;
  is_enabled: boolean;
  is_hard_rule: boolean;
  priority: number;
  scope: Record<string, unknown>;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertProgramCallRuleInput = {
  id?: string;
  programId: string;
  ruleSetId: string;
  ruleType: string;
  name: string;
  isEnabled: boolean;
  isHardRule: boolean;
  priority?: number;
  scope?: Record<string, unknown>;
  config?: Record<string, unknown>;
  createdBy?: string | null;
};

export class StaleProgramRuleSetError extends Error {
  constructor(message = "Rule set has been modified since you last loaded it.") {
    super(message);
    this.name = "StaleProgramRuleSetError";
  }
}

export async function getProgramRuleSets(programId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_call_rule_sets")
    .select("*")
    .eq("program_id", programId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch rule sets: ${error.message}`);
  }

  return (data ?? []) as ProgramCallRuleSet[];
}

export async function getDefaultProgramRuleSet(programId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_call_rule_sets")
    .select("*")
    .eq("program_id", programId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch default rule set: ${error.message}`);
  }

  return data as ProgramCallRuleSet | null;
}

export async function createProgramRuleSet(input: {
  programId: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  createdBy?: string | null;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_call_rule_sets")
    .insert({
      program_id: input.programId,
      name: input.name,
      description: input.description ?? null,
      is_default: input.isDefault ?? false,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create rule set: ${error.message}`);
  }

  return data as ProgramCallRuleSet;
}

export async function getProgramRules(programId: string, ruleSetId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("program_call_rules")
    .select("*")
    .eq("program_id", programId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (ruleSetId) {
    query = query.eq("rule_set_id", ruleSetId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch rules: ${error.message}`);
  }

  const rows = (data ?? []) as ProgramCallRule[];
  return migratePersistedCallRules(rows).rules;
}

export async function getRawProgramRulesWithAdmin(programId: string, ruleSetId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("program_call_rules")
    .select("*")
    .eq("program_id", programId)
    .eq("rule_set_id", ruleSetId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch existing rules: ${error.message}`);
  }

  return (data ?? []) as ProgramCallRule[];
}

export async function prepareProgramRulesForReplacement(input: {
  programId: string;
  ruleSetId: string;
  rules: UpsertProgramCallRuleInput[];
  userId: string;
}) {
  const existingRows = await getRawProgramRulesWithAdmin(input.programId, input.ruleSetId);
  const mergedRules = mergeEditableRulesWithProtectedRows({ editableRules: input.rules, existingRows });
  const existingById = new Map(existingRows.map((rule) => [rule.id, rule]));
  return mergedRules.map((rule, index) => {
    const existing = rule.id ? existingById.get(rule.id) : undefined;
    return {
      ...existing,
      id: rule.id ?? randomUUID(),
      program_id: input.programId,
      rule_set_id: input.ruleSetId,
      rule_type: rule.ruleType,
      name: rule.name,
      is_enabled: rule.isEnabled,
      is_hard_rule: rule.isHardRule,
      priority: rule.priority ?? (index + 1) * 10,
      scope: rule.scope ?? getDefaultRuleScope(),
      config: rule.config ?? {},
      created_by: rule.createdBy ?? existing?.created_by ?? input.userId,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: existing?.updated_at ?? new Date().toISOString(),
    } satisfies ProgramCallRule;
  });
}

export async function replaceProgramRulesForRuleSet(input: {
  programId: string;
  ruleSetId: string;
  rules: UpsertProgramCallRuleInput[];
  userId: string;
  /**
   * When true, explicitly allow saving an empty rule list (wipes all rules for the set).
   * Default false to protect against accidental full deletion from bad payloads.
   */
  allowEmpty?: boolean;
  previousRuleSetUpdatedAt?: string | null;
}) {
  const supabase = createAdminClient();

  // 1. Guard: never delete if caller accidentally passed empty unless explicitly allowed
  if (input.rules.length === 0 && !input.allowEmpty) {
    // Return current rules instead of wiping (defensive)
    return {
      rules: await getProgramRules(input.programId, input.ruleSetId),
      ruleSetUpdatedAt: null,
    };
  }

  // 2. Basic validation before touching the DB (fail fast, no partial wipe)
  for (const r of input.rules) {
    if (!r.ruleType?.trim() || !r.name?.trim()) {
      throw new Error("Each rule must have a non-empty ruleType and name");
    }
    if (typeof r.isEnabled !== "boolean" || typeof r.isHardRule !== "boolean") {
      throw new Error("isEnabled and isHardRule must be booleans");
    }
  }

  const existingRows = await getRawProgramRulesWithAdmin(input.programId, input.ruleSetId);
  const mergedRules = mergeEditableRulesWithProtectedRows({
    editableRules: input.rules,
    existingRows,
  });
  const rows = mergedRules.map((rule, index) => ({
    id: rule.id ?? null,
    rule_type: rule.ruleType,
    name: rule.name,
    is_enabled: rule.isEnabled,
    is_hard_rule: rule.isHardRule,
    priority: rule.priority ?? (index + 1) * 10,
    scope: rule.scope ?? getDefaultRuleScope(),
    config: rule.config ?? {},
    created_by: rule.createdBy ?? input.userId,
  }));

  const { data, error } = await supabase.rpc(
    "replace_program_call_rules_transactional",
    {
      p_program_id: input.programId,
      p_rule_set_id: input.ruleSetId,
      p_actor_user_id: input.userId,
      p_previous_updated_at: input.previousRuleSetUpdatedAt ?? null,
      p_rules: rows,
    }
  );

  if (error) {
    if (error.message.includes("STALE_RULE_SET")) {
      throw new StaleProgramRuleSetError();
    }
    throw new Error(`Failed to save rules transactionally: ${error.message}`);
  }

  const payload = data as { rules?: ProgramCallRule[]; ruleSetUpdatedAt?: string } | null;
  return {
    rules: payload?.rules ?? [],
    ruleSetUpdatedAt: payload?.ruleSetUpdatedAt ?? null,
  };
}
