import {
  auditRulesForAuthoringV2,
  type AuthoringCompatibilityAudit,
  type AuthoringPanel,
  type LegacyRuleForAuthoringAudit,
  LEGACY_AUTHORING_ADAPTERS,
} from "./authoring-schema-v2.ts";

export type PolicySeverityV2 = "hard" | "soft";

export type PolicySourceV2 = {
  sourceId: string;
  sourceType: string;
  name: string;
  enabled: boolean;
  severity: PolicySeverityV2;
  priority: number;
  sourceOrder: number;
  config: Record<string, unknown>;
};

export type PolicyPanelV2 = {
  id: AuthoringPanel;
  title: string;
  sources: PolicySourceV2[];
};

export type PolicyRelationshipV2 = {
  id: string;
  kind: "slot_pairing" | "eligibility_progression" | "fallback_tier";
  sourceSlot?: string;
  targetSlot?: string;
  definition: Record<string, unknown>;
  sourceRuleIds: string[];
};

export type ProgramCallPolicyDocumentV2 = {
  schemaVersion: 2;
  ruleSetId: string;
  name: string;
  generatedAt: string;
  panels: PolicyPanelV2[];
  relationships: PolicyRelationshipV2[];
  compatibility: AuthoringCompatibilityAudit;
};

export type PersistedRuleForPolicyV2 = LegacyRuleForAuthoringAudit & {
  id: string;
};

const PANEL_TITLES: Record<AuthoringPanel, string> = {
  slots: "Call positions",
  eligibility: "Resident eligibility",
  rotationAvailability: "Rotation availability",
  workload: "Monthly workload",
  spacingPreferences: "Spacing and preferences",
  buddyPathway: "Buddy pathway",
};

function relationshipProjection(rules: PersistedRuleForPolicyV2[]): PolicyRelationshipV2[] {
  const relationships: PolicyRelationshipV2[] = [];
  const buddy = rules.find((rule) => rule.rule_type === "buddy_requirement");
  const buddySlot = rules.find(
    (rule) =>
      rule.rule_type === "call_slot_definition" && rule.config?.slotCallType === "Buddy"
  );
  const backupSlot = rules.find(
    (rule) =>
      rule.rule_type === "call_slot_definition" && rule.config?.slotCallType === "Backup"
  );

  if (buddy) {
    relationships.push({
      id: "buddy-primary-pairing",
      kind: "slot_pairing",
      sourceSlot: "Buddy",
      targetSlot: "Primary",
      definition: {
        partnerPgyYears: buddy.config?.partnerPgyYears ?? [buddy.config?.partnerPgyYear ?? 4],
        daysOfWeek: buddy.config?.allowedDaysOfWeek ?? buddySlot?.config?.slotDaysOfWeek ?? [5, 6],
        severity: "hard",
      },
      sourceRuleIds: [buddy.id, ...(buddySlot ? [buddySlot.id] : [])],
    });

    relationships.push({
      id: "intern-primary-progression",
      kind: "eligibility_progression",
      targetSlot: "Primary",
      definition: {
        pgyYears: buddy.config?.buddyPgyYears ?? [1],
        serviceTokens: buddy.config?.internPrimaryServiceTokens ?? ["ortho"],
        fromServiceMonthIndex: buddy.config?.internPrimaryFromServiceMonthIndex ?? 2,
      },
      sourceRuleIds: [buddy.id],
    });
  }

  if (backupSlot && Array.isArray(backupSlot.config?.slotFallbackPgyYears)) {
    relationships.push({
      id: "backup-fallback-tier",
      kind: "fallback_tier",
      targetSlot: "Backup",
      definition: {
        pgyYears: backupSlot.config.slotFallbackPgyYears,
        label: backupSlot.config.slotFallbackLabel ?? "Fallback coverage",
        preference: 1,
      },
      sourceRuleIds: [backupSlot.id],
    });
  }

  return relationships;
}

export function projectLegacyRulesToPolicyDocumentV2(params: {
  ruleSetId: string;
  name: string;
  rules: PersistedRuleForPolicyV2[];
  generatedAt?: string;
}): ProgramCallPolicyDocumentV2 {
  const compatibility = auditRulesForAuthoringV2(params.rules);
  if (compatibility.blockers.length > 0) {
    throw new Error(
      `Cannot project rules with compatibility blockers: ${compatibility.blockers
        .map((blocker) => blocker.code)
        .join(", ")}`
    );
  }

  const panels: PolicyPanelV2[] = (Object.keys(PANEL_TITLES) as AuthoringPanel[]).map((panel) => ({
    id: panel,
    title: PANEL_TITLES[panel],
    sources: params.rules
      .filter((rule) => LEGACY_AUTHORING_ADAPTERS[rule.rule_type]?.panel === panel)
      .map((rule) => ({
        sourceId: rule.id,
        sourceType: rule.rule_type,
        name: rule.name ?? rule.rule_type,
        enabled: rule.is_enabled !== false,
        severity: rule.is_hard_rule ? ("hard" as const) : ("soft" as const),
        priority: rule.priority ?? 0,
        sourceOrder: params.rules.indexOf(rule),
        config: { ...(rule.config ?? {}) },
      })),
  }));

  return {
    schemaVersion: 2,
    ruleSetId: params.ruleSetId,
    name: params.name,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    panels,
    relationships: relationshipProjection(params.rules),
    compatibility,
  };
}

/** Exact source recovery used for shadow-write and rollback verification. */
export function recoverLegacySourcesFromPolicyDocumentV2(
  document: ProgramCallPolicyDocumentV2
): PersistedRuleForPolicyV2[] {
  return document.panels
    .flatMap((panel) => panel.sources)
    .map((source) => ({
      id: source.sourceId,
      rule_type: source.sourceType,
      name: source.name,
      is_enabled: source.enabled,
      is_hard_rule: source.severity === "hard",
      priority: source.priority,
      sourceOrder: source.sourceOrder,
      config: { ...source.config },
    }))
    .sort((a, b) => a.sourceOrder - b.sourceOrder)
    .map((source) => {
      const rule = { ...source };
      delete (rule as Partial<typeof rule>).sourceOrder;
      return rule;
    });
}
