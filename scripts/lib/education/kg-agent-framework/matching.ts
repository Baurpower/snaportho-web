/**
 * Deterministic capability matching for Agent Registry.
 *
 * Rules:
 * 1. Exact capability match wins (entity type, prefix).
 * 2. Prefix matches only when explicitly declared AND prefix matches.
 * 3. Generic fallback agents match only after specialized agents fail.
 */

import type { OntologyGap } from "../kg-compiler/types.ts";
import type { AgentCapabilities } from "./contract.ts";

export type GapMatchResult = {
  matches: boolean;
  specificity: number;
  reasons: string[];
};

const GAP_KIND_BASE_SPECIFICITY = 10;
const ENTITY_TYPE_SPECIFICITY = 100;
const PREFIX_SPECIFICITY = 200;
const GENERIC_FALLBACK_SPECIFICITY = 1;

export function scoreGapMatch(
  capabilities: AgentCapabilities,
  gap: OntologyGap
): GapMatchResult {
  const reasons: string[] = [];

  if (!capabilities.handlesGapKinds.includes(gap.kind)) {
    return { matches: false, specificity: 0, reasons: ["gap_kind_mismatch"] };
  }

  let specificity = GAP_KIND_BASE_SPECIFICITY;
  reasons.push(`handles_gap_kind:${gap.kind}`);

  if (gap.kind === "missing_entity" && gap.entityType) {
    if (capabilities.handlesEntityTypes?.length) {
      if (!capabilities.handlesEntityTypes.includes(gap.entityType)) {
        return {
          matches: false,
          specificity: 0,
          reasons: [`entity_type_mismatch:${gap.entityType}`],
        };
      }
      specificity += ENTITY_TYPE_SPECIFICITY;
      reasons.push(`entity_type_match:${gap.entityType}`);
    }
  }

  if (capabilities.handlesOntologyRulePrefixes?.length) {
    const prefixMatch = capabilities.handlesOntologyRulePrefixes.some((prefix) =>
      gap.ontologyRule.startsWith(prefix)
    );
    if (!prefixMatch) {
      return {
        matches: false,
        specificity: 0,
        reasons: [`prefix_mismatch:${gap.ontologyRule}`],
      };
    }
    specificity += PREFIX_SPECIFICITY;
    reasons.push(`prefix_match:${gap.ontologyRule}`);
  }

  if (capabilities.isGenericFallback) {
    specificity = GENERIC_FALLBACK_SPECIFICITY;
    reasons.push("generic_fallback");
  }

  return { matches: true, specificity, reasons };
}

export function compareGapMatchSpecificity(a: number, b: number): number {
  return b - a;
}