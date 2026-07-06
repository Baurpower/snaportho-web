import type { ProgramCallRule } from "@/lib/workspace/call/programcallrules";
import type { ProgramRule } from "@/lib/workspace/call/rule-definitions";

export const BACKUP_REQUIRED_EXPLICIT_KEY = "backupRequiredExplicit";

type PersistedRuleLike = {
  id?: string;
  rule_type?: string;
  ruleType?: string;
  name?: string;
  config?: Record<string, unknown> | null;
};

export type PersistedRuleMigrationResult<T extends PersistedRuleLike> = {
  rule: T;
  changed: boolean;
  reasons: string[];
};

function getRuleType(rule: PersistedRuleLike): string {
  return (rule.rule_type ?? rule.ruleType ?? "").trim();
}

function getConfig(rule: PersistedRuleLike): Record<string, unknown> {
  return { ...(rule.config ?? {}) };
}

function includesBackupCallType(requiredCallTypes: unknown): boolean {
  return (
    Array.isArray(requiredCallTypes) &&
    requiredCallTypes.some((value) => String(value).toLowerCase() === "backup")
  );
}

function isExplicitBackupRequired(config: Record<string, unknown>): boolean {
  return config[BACKUP_REQUIRED_EXPLICIT_KEY] === true;
}

export function migratePersistedCallRule<T extends PersistedRuleLike>(
  rule: T
): PersistedRuleMigrationResult<T> {
  const ruleType = getRuleType(rule);
  const config = getConfig(rule);
  const reasons: string[] = [];
  let changed = false;

  if (ruleType === "required_daily_call_slots") {
    if (includesBackupCallType(config.requiredCallTypes) && !isExplicitBackupRequired(config)) {
      config.requiredCallTypes = (config.requiredCallTypes as unknown[]).filter(
        (value) => String(value).toLowerCase() !== "backup"
      );
      changed = true;
      reasons.push("removed_legacy_required_daily_backup");
    }
  }

  if (ruleType === "call_slot_definition") {
    const slotCallType = String(config.slotCallType ?? "").trim();
    if (
      slotCallType === "Backup" &&
      config.slotRequiredWhenVisible === true &&
      !isExplicitBackupRequired(config)
    ) {
      config.slotRequiredWhenVisible = false;
      changed = true;
      reasons.push("cleared_legacy_backup_required_when_visible");
    }
  }

  if (!changed) {
    return { rule, changed: false, reasons: [] };
  }

  return {
    rule: {
      ...rule,
      config,
    },
    changed: true,
    reasons,
  };
}

export function migratePersistedCallRules<T extends PersistedRuleLike>(rules: T[]) {
  const migrated = rules.map((rule) => migratePersistedCallRule(rule));
  return {
    rules: migrated.map((entry) => entry.rule),
    changedRules: migrated.filter((entry) => entry.changed),
    changedCount: migrated.filter((entry) => entry.changed).length,
  };
}

export function toProgramRulesFromDbRows(
  rows: ProgramCallRule[]
): ProgramRule[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    rule_type: row.rule_type as ProgramRule["rule_type"],
    is_enabled: row.is_enabled,
    is_hard_rule: row.is_hard_rule,
    config: (row.config ?? {}) as ProgramRule["config"],
  }));
}

export function findBackupRequirementSources(rules: PersistedRuleLike[]) {
  const requiredDaily = rules.find((rule) => {
    const ruleType = getRuleType(rule);
    const config = getConfig(rule);
    return (
      ruleType === "required_daily_call_slots" &&
      includesBackupCallType(config.requiredCallTypes)
    );
  });

  const backupSlot = rules.find((rule) => {
    const ruleType = getRuleType(rule);
    const config = getConfig(rule);
    return (
      ruleType === "call_slot_definition" &&
      String(config.slotCallType ?? "") === "Backup" &&
      config.slotRequiredWhenVisible === true
    );
  });

  return {
    requiredDailyCallSlotsRule: requiredDaily ?? null,
    backupSlotDefinitionRule: backupSlot ?? null,
  };
}