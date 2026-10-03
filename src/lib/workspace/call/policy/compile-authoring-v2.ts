import type { ProgramCallSlotDefinition, ProgramRule } from "../rule-definitions";
import {
  recoverLegacySourcesFromPolicyDocumentV2,
  type ProgramCallPolicyDocumentV2,
} from "./authoring-document-v2";
import { compilePolicy } from "./compile";

function numberArray(value: unknown): number[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "number")
    ? value
    : null;
}

/**
 * Materialize the canonical v2 relationships into the transitional legacy source
 * rows. This makes relationships authoritative while the existing policy compiler
 * remains the single scheduling engine.
 */
export function materializePolicyDocumentV2(document: ProgramCallPolicyDocumentV2) {
  const rules = recoverLegacySourcesFromPolicyDocumentV2(document).map((rule) => ({
    ...rule,
    config: { ...(rule.config ?? {}) },
  }));

  for (const relationship of document.relationships) {
    if (relationship.id === "buddy-primary-pairing") {
      const partnerPgyYears = numberArray(relationship.definition.partnerPgyYears);
      const daysOfWeek = numberArray(relationship.definition.daysOfWeek);
      const buddyRule = rules.find((rule) => rule.rule_type === "buddy_requirement");
      const buddySlot = rules.find(
        (rule) =>
          rule.rule_type === "call_slot_definition" && rule.config.slotCallType === "Buddy"
      );
      if (buddyRule && partnerPgyYears) buddyRule.config.partnerPgyYears = partnerPgyYears;
      if (buddyRule && daysOfWeek) buddyRule.config.allowedDaysOfWeek = daysOfWeek;
      if (buddySlot && partnerPgyYears) {
        buddySlot.config.slotCondition = {
          type: "when_pgy_scheduled",
          pgyYears: partnerPgyYears,
          sourceSlotCallTypes: [relationship.targetSlot ?? "Primary"],
        };
      }
      if (buddySlot && daysOfWeek) buddySlot.config.slotDaysOfWeek = daysOfWeek;
    }

    if (relationship.id === "intern-primary-progression") {
      const buddyRule = rules.find((rule) => rule.rule_type === "buddy_requirement");
      if (!buddyRule) continue;
      const pgyYears = numberArray(relationship.definition.pgyYears);
      const serviceTokens = Array.isArray(relationship.definition.serviceTokens)
        ? relationship.definition.serviceTokens.filter(
            (item): item is string => typeof item === "string"
          )
        : null;
      const fromServiceMonthIndex = relationship.definition.fromServiceMonthIndex;
      if (pgyYears) buddyRule.config.buddyPgyYears = pgyYears;
      if (serviceTokens) buddyRule.config.internPrimaryServiceTokens = serviceTokens;
      if (typeof fromServiceMonthIndex === "number") {
        buddyRule.config.internPrimaryFromServiceMonthIndex = fromServiceMonthIndex;
      }
    }

    if (relationship.id === "backup-fallback-tier") {
      const backupSlot = rules.find(
        (rule) =>
          rule.rule_type === "call_slot_definition" && rule.config.slotCallType === "Backup"
      );
      if (!backupSlot) continue;
      const pgyYears = numberArray(relationship.definition.pgyYears);
      if (pgyYears) backupSlot.config.slotFallbackPgyYears = pgyYears;
      if (typeof relationship.definition.label === "string") {
        backupSlot.config.slotFallbackLabel = relationship.definition.label;
      }
    }
  }

  return rules;
}

function slotDefinitions(rules: ReturnType<typeof materializePolicyDocumentV2>) {
  return rules
    .filter((rule) => rule.rule_type === "call_slot_definition" && rule.is_enabled !== false)
    .map((rule, index): ProgramCallSlotDefinition => ({
      id: rule.id ?? `slot-${index}`,
      label: String(rule.config.slotLabel ?? rule.name ?? rule.rule_type),
      shortLabel: String(rule.config.slotShortLabel ?? ""),
      callType: String(rule.config.slotCallType ?? rule.name ?? rule.rule_type),
      colorKey: String(rule.config.slotColorKey ?? "slate"),
      requiredMode: rule.config.slotRequiredMode as ProgramCallSlotDefinition["requiredMode"],
      daysOfWeek: rule.config.slotDaysOfWeek as number[] | undefined,
      condition: rule.config.slotCondition as ProgramCallSlotDefinition["condition"],
      countsTowardWorkload: rule.config.slotCountsTowardWorkload !== false,
      requiredWhenVisible: rule.config.slotRequiredWhenVisible !== false,
      sortOrder: Number(rule.config.slotSortOrder ?? index),
    }));
}

export function compilePolicyDocumentV2(document: ProgramCallPolicyDocumentV2) {
  const rules = materializePolicyDocumentV2(document);
  return compilePolicy(rules as ProgramRule[], slotDefinitions(rules));
}
