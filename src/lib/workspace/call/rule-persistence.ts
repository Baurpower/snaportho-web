import type { ProgramCallRule, UpsertProgramCallRuleInput } from "./programcallrules.ts";
import { RULE_DEFINITION_MAP, type RuleType } from "./rule-definitions.ts";

/** Rules whose configuration is scheduler-managed and must not be mutated by the generic editor. */
export const PROTECTED_PROGRAM_RULE_TYPES = new Set<string>(["buddy_requirement"]);

export class ProtectedProgramRuleMutationError extends Error {
  constructor(type: string) {
    super(`Rule type is system-managed and cannot be edited here: ${type}`);
    this.name = "ProtectedProgramRuleMutationError";
  }
}

export function isProtectedProgramRuleType(type: string) {
  return PROTECTED_PROGRAM_RULE_TYPES.has(type) || !RULE_DEFINITION_MAP[type as RuleType];
}

export function assertEditableProgramRuleType(type: string) {
  if (isProtectedProgramRuleType(type)) {
    throw new ProtectedProgramRuleMutationError(type);
  }
}

/**
 * Preserve scheduler-managed and forward-compatible rows from the database.
 * The client is deliberately not trusted to round-trip these rows.
 */
export function mergeEditableRulesWithProtectedRows(params: {
  editableRules: UpsertProgramCallRuleInput[];
  existingRows: ProgramCallRule[];
}): UpsertProgramCallRuleInput[] {
  const protectedRows = params.existingRows
    .filter((row) => isProtectedProgramRuleType(row.rule_type))
    .map((row) => ({
      id: row.id,
      programId: row.program_id,
      ruleSetId: row.rule_set_id,
      ruleType: row.rule_type,
      name: row.name,
      isEnabled: row.is_enabled,
      isHardRule: row.is_hard_rule,
      priority: row.priority,
      scope: row.scope,
      config: row.config,
      createdBy: row.created_by,
    }));

  return [...params.editableRules, ...protectedRows];
}
