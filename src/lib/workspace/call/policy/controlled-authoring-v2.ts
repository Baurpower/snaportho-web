import { normalizeRuleForSave } from "../rule-definitions";
import { auditRulesForAuthoringV2, type AuthoringPanel } from "./authoring-schema-v2";
import {
  type PolicySourceV2,
  type ProgramCallPolicyDocumentV2,
} from "./authoring-document-v2";
import { compilePolicyDocumentV2, materializePolicyDocumentV2 } from "./compile-authoring-v2";

const EDITABLE_PANELS = new Set<AuthoringPanel>(["workload", "spacingPreferences"]);

export class ControlledPolicyEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlledPolicyEditError";
  }
}

function stable(value: unknown) {
  const canonicalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(canonicalize);
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, canonicalize(item)])
      );
    }
    return input;
  };
  return JSON.stringify(canonicalize(value));
}

function sourceIdentity(source: PolicySourceV2) {
  return {
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    sourceOrder: source.sourceOrder,
  };
}

export function validateControlledPolicyDocumentEdit(params: {
  current: ProgramCallPolicyDocumentV2;
  candidate: ProgramCallPolicyDocumentV2;
}) {
  const { current, candidate } = params;
  if (candidate.schemaVersion !== 2 || candidate.ruleSetId !== current.ruleSetId) {
    throw new ControlledPolicyEditError("Policy schema or rule set does not match");
  }
  if (candidate.name !== current.name) {
    throw new ControlledPolicyEditError("Rule-set identity cannot be edited here");
  }
  if (stable(candidate.relationships) !== stable(current.relationships)) {
    throw new ControlledPolicyEditError("Policy relationships are not editable in this rollout");
  }

  const currentPanels = new Map(current.panels.map((panel) => [panel.id, panel]));
  if (candidate.panels.length !== current.panels.length) {
    throw new ControlledPolicyEditError("Policy panels cannot be added or removed");
  }
  for (const panel of candidate.panels) {
    const currentPanel = currentPanels.get(panel.id);
    if (!currentPanel) throw new ControlledPolicyEditError(`Unknown policy panel: ${panel.id}`);
    if (!EDITABLE_PANELS.has(panel.id)) {
      if (stable(panel) !== stable(currentPanel)) {
        throw new ControlledPolicyEditError(`${panel.title} is read-only in this rollout`);
      }
      continue;
    }
    if (panel.sources.length !== currentPanel.sources.length) {
      throw new ControlledPolicyEditError("Rules cannot be added or removed in this rollout");
    }
    for (let index = 0; index < panel.sources.length; index += 1) {
      const source = panel.sources[index]!;
      const existing = currentPanel.sources[index]!;
      if (stable(sourceIdentity(source)) !== stable(sourceIdentity(existing))) {
        throw new ControlledPolicyEditError("Rule identity or ordering cannot be changed");
      }
      if (source.name !== existing.name) {
        throw new ControlledPolicyEditError("Rule names are not editable in this rollout");
      }
    }
  }

  const materialized = materializePolicyDocumentV2(candidate);
  const editableSourceIds = new Set(
    candidate.panels
      .filter((panel) => EDITABLE_PANELS.has(panel.id))
      .flatMap((panel) => panel.sources.map((source) => source.sourceId))
  );
  for (const rule of materialized.filter((item) => editableSourceIds.has(item.id))) {
    const normalized = normalizeRuleForSave({
      id: rule.id,
      type: rule.rule_type,
      name: rule.name ?? rule.rule_type,
      enabled: rule.is_enabled !== false,
      isHardRule: rule.is_hard_rule === true,
      config: rule.config,
    });
    if (rule.rule_type === "monthly_load_target_by_pgy") {
      const minimum = Number(rule.config.targetMinCalls ?? 0);
      const targetMaximum = Number(rule.config.targetMaxCalls ?? 0);
      const hardMaximum = Number(rule.config.targetHardMaxCalls ?? 0);
      if (minimum > targetMaximum || targetMaximum > hardMaximum) {
        throw new ControlledPolicyEditError(
          `${rule.name ?? "Monthly workload"} must satisfy minimum ≤ target maximum ≤ hard maximum`
        );
      }
    }
    if (stable(normalized.config) !== stable(rule.config)) {
      throw new ControlledPolicyEditError(`${rule.name ?? rule.rule_type} contains invalid values`);
    }
  }
  const compatibility = auditRulesForAuthoringV2(materialized);
  if (compatibility.blockers.length > 0) {
    throw new ControlledPolicyEditError(
      `Policy has compatibility blockers: ${compatibility.blockers.map((item) => item.code).join(", ")}`
    );
  }
  compilePolicyDocumentV2(candidate);

  return {
    ...candidate,
    generatedAt: new Date().toISOString(),
    compatibility,
  } satisfies ProgramCallPolicyDocumentV2;
}
