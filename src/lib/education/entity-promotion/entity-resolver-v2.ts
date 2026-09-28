/** Phase 3 entity resolver: canonical → alias → negative → typed propose.
 *
 * Resolution order for a candidate label:
 *   1. Exact canonical normalized-label match → link_canonical.
 *   2. Reviewed alias (canonical_entity_aliases, approved + active) → link_canonical.
 *   3. Rejected normalized label (entity_review_decisions REJECT_*) → suppress.
 *   4. Non-entity label shapes (boolean tokens, verb fragments, deictic or
 *      count-shaped phrases) → suppress with evidence.
 *   5. Otherwise → propose with improved type inference.
 *
 * Alias and negative inputs are durable data passed by the caller — never
 * hard-coded review-slice contents.
 *
 * Factory integration points (not wired here; Phase 2 behavior unchanged):
 * - The EntityIndexRow builder must union approved canonical_entity_aliases
 *   into row.aliases; factory lookups already consult row aliases.
 * - The factory proposal path should call resolveEntityLabelForPropose (or an
 *   equivalent negative check) before buildProposedEntity.
 */

import type { AliasRef, CanonicalRef } from "./canonical-candidate-matcher";
import { DEICTIC_PHRASE_SEEDS } from "./entity-review-dispositions";
import { entityMatchKeys, normalizeEntityLabelForMatch } from "./entity-label-normalization";
import { inferEntityType, type EntityTypeInference } from "./entity-type-inference";
import { isContextShapedLabel } from "./review-packet";

export const ENTITY_RESOLVER_VERSION = "entity-resolver.v2" as const;

export type ResolverInputs = {
  canonicalIndex: CanonicalRef[];
  /** Approved + active reviewed aliases only; the caller filters review state. */
  aliases: AliasRef[];
  /** Normalized labels with a durable REJECT_* decision. */
  rejectedLabels: Set<string>;
};

export type EntityResolution =
  | {
    action: "link_canonical";
    canonicalEntityId: string;
    via: "exact_label" | "reviewed_alias";
    normalizedLabel: string;
    entityType: string;
    confidence: number;
    evidence: string[];
  }
  | {
    action: "suppress";
    reason: "rejected_label" | "non_entity_shape";
    detail: string;
    normalizedLabel: string;
    evidence: string[];
  }
  | {
    action: "propose";
    normalizedLabel: string;
    inference: EntityTypeInference;
    evidence: string[];
  };

const BOOLEAN_TOKEN_RE = /^(true|false|yes|no)[!.]?$/i;

function hasDeictic(normalized: string): boolean {
  return (DEICTIC_PHRASE_SEEDS as readonly string[]).some((seed) => normalized.includes(seed));
}

export function resolveEntityLabelForPropose(
  preferredLabel: string,
  inputs: ResolverInputs,
  claimHints?: { texts: string[] },
): EntityResolution {
  const normalizedLabel = normalizeEntityLabelForMatch(preferredLabel);
  const keys = entityMatchKeys(preferredLabel);
  if (normalizedLabel) keys.push(normalizedLabel);

  // 1. Exact canonical match (any match key, any type — type skew in the
  // proposal must never block a canonical hit; the canonical row owns truth).
  for (const canonical of inputs.canonicalIndex) {
    const canonicalKeys = entityMatchKeys(canonical.preferredLabel);
    if (canonical.normalizedLabel) canonicalKeys.push(canonical.normalizedLabel);
    if (canonicalKeys.some((key) => keys.includes(key))) {
      return {
        action: "link_canonical",
        canonicalEntityId: canonical.id,
        via: "exact_label",
        normalizedLabel,
        entityType: canonical.entityType,
        confidence: 1,
        evidence: ["exact_normalized_label"],
      };
    }
  }

  // 2. Reviewed alias.
  const aliasByNorm = new Map<string, AliasRef>();
  for (const alias of inputs.aliases) {
    if (!aliasByNorm.has(alias.aliasNormalized)) aliasByNorm.set(alias.aliasNormalized, alias);
  }
  for (const key of keys) {
    const hit = aliasByNorm.get(key);
    if (hit) {
      const target = inputs.canonicalIndex.find((entry) => entry.id === hit.canonicalEntityId);
      if (target) {
        return {
          action: "link_canonical",
          canonicalEntityId: target.id,
          via: "reviewed_alias",
          normalizedLabel,
          entityType: target.entityType,
          confidence: 0.95,
          evidence: [`reviewed_alias_${hit.aliasType}`],
        };
      }
    }
  }

  // 3. Durable negative.
  if (inputs.rejectedLabels.has(normalizedLabel)) {
    return {
      action: "suppress",
      reason: "rejected_label",
      detail: "prior REJECT_* decision for this normalized label",
      normalizedLabel,
      evidence: ["negative_decision_hit"],
    };
  }

  // 4. Non-entity shapes.
  const inference = inferEntityType(preferredLabel, normalizedLabel, claimHints);
  const shapeReasons: string[] = [];
  if (BOOLEAN_TOKEN_RE.test(preferredLabel.trim())) shapeReasons.push("boolean_token");
  if (inference.flags.includes("likely_verb_fragment")) shapeReasons.push("verb_fragment");
  if (hasDeictic(normalizedLabel)) shapeReasons.push("deictic_phrase");
  if (isContextShapedLabel(preferredLabel)) shapeReasons.push("count_or_clause_shape");
  if (shapeReasons.length > 0) {
    return {
      action: "suppress",
      reason: "non_entity_shape",
      detail: shapeReasons.join("+"),
      normalizedLabel,
      evidence: shapeReasons,
    };
  }

  // 5. Propose with improved typing.
  return {
    action: "propose",
    normalizedLabel,
    inference,
    evidence: inference.reasons,
  };
}
