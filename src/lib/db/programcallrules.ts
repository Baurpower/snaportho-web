import { createClient } from "@/utils/supabase/server";

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

  return (data ?? []) as ProgramCallRule[];
}

export async function replaceProgramRulesForRuleSet(input: {
  programId: string;
  ruleSetId: string;
  rules: UpsertProgramCallRuleInput[];
  userId: string;
}) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("program_call_rules")
    .delete()
    .eq("program_id", input.programId)
    .eq("rule_set_id", input.ruleSetId);

  if (deleteError) {
    throw new Error(`Failed to clear existing rules: ${deleteError.message}`);
  }

  if (input.rules.length === 0) {
    return [];
  }

  const rows = input.rules.map((rule, index) => ({
    program_id: input.programId,
    rule_set_id: input.ruleSetId,
    rule_type: rule.ruleType,
    name: rule.name,
    is_enabled: rule.isEnabled,
    is_hard_rule: rule.isHardRule,
    priority: rule.priority ?? (index + 1) * 10,
    scope: rule.scope ?? {},
    config: rule.config ?? {},
    created_by: input.userId,
  }));

  const { data, error } = await supabase
    .from("program_call_rules")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`Failed to save rules: ${error.message}`);
  }

  return (data ?? []) as ProgramCallRule[];
}