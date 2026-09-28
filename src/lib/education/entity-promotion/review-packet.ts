/** Review-packet assembly: disposition recommendations, claim context,
 * mixed-sense detection, and impact ranking (Steps 9-10).
 *
 * Recommendations are review inputs, never decisions. Every PROMOTE or
 * MERGE recommendation carries needsFullDbRecheck because offline runs see
 * only a partial canonical index.
 */

import type {
  CanonicalCandidate,
} from "./canonical-candidate-matcher";
import {
  DEICTIC_PHRASE_SEEDS,
  GENERIC_PHRASE_SEEDS,
  type EntityDisposition,
} from "./entity-review-dispositions";
import { isElidedLabel, type EntityTypeInference } from "./entity-type-inference";
import type { ProposalCluster } from "./proposal-clustering";
import { looksLikeAcronym, normalizeEntityLabelForMatch } from "./entity-label-normalization";

export const REVIEW_PACKET_VERSION = "entity-review-packet.v1" as const;
export const REVIEW_SLICE_TARGET = 200 as const;

export type PacketProposal = {
  entityId: string;
  preferredLabel: string;
  normalizedLabel: string;
  factoryType: string;
  claimIds: string[];
  cardIds: string[];
  tags: string[];
};

export type PacketContext = {
  inferredType: EntityTypeInference;
  candidates: CanonicalCandidate[];
  cluster?: ProposalCluster;
  isClusterHead: boolean;
  claimTexts: string[];
  neighborLabels: string[];
};

export type DispositionRecommendation = {
  disposition: EntityDisposition;
  confidence: number;
  reason: string;
  recommendedCanonicalLabel?: string;
  recommendedType?: string;
  recommendedTargetId?: string;
  needsFullDbRecheck: boolean;
};

export type ReviewRow = {
  proposalId: string;
  proposedLabel: string;
  proposedType: string;
  inferredType: string;
  inferredTypeConfidence: number;
  claimCount: number;
  cardCount: number;
  tags: string[];
  exampleClaims: string[];
  neighborLabels: string[];
  bestCandidates: Array<{
    entityId: string;
    label: string;
    type: string;
    score: number;
    evidence: string[];
  }>;
  clusterId?: string;
  clusterSize?: number;
  clusterHeadLabel?: string;
  recommendation: DispositionRecommendation;
  impactScore: number;
};

/** Head nouns that disambiguate elided adjectives. Two or more distinct
 * disambiguators across a proposal's claims => multi-sense risk. */
const SENSE_DISAMBIGUATORS = [
  "nerve",
  "artery",
  "vein",
  "vessel",
  "muscle",
  "tendon",
  "ligament",
  "tear",
  "head",
  "neck",
  "fracture",
  "approach",
  "view",
  "incision",
];

/** Joint tokens for acronym sense-splitting ("LCL" knee vs elbow). */
const JOINT_DISAMBIGUATORS = [
  "knee",
  "hip",
  "shoulder",
  "elbow",
  "wrist",
  "ankle",
  "hand",
  "foot",
  "spine",
];

/** Short single-token labels (acronyms: LCL, MRI, PCL) take the joint-
 * divergence check; longer labels would false-positive on incidental
 * anatomy ("varus" + "talar neck fracture"). */
export function isShortAcronymLike(normalizedLabel: string): boolean {
  return !normalizedLabel.includes(" ") && normalizedLabel.length <= 4;
}

export function detectJointDivergence(claimTexts: string[]): string[] {
  const perClaim = claimTexts.map((text) => {
    const lower = text.toLowerCase();
    return new Set(JOINT_DISAMBIGUATORS.filter((joint) => lower.includes(joint)));
  });
  for (let i = 0; i < perClaim.length; i++) {
    if (perClaim[i].size === 0) continue;
    for (let j = i + 1; j < perClaim.length; j++) {
      if (perClaim[j].size === 0) continue;
      const shared = [...perClaim[i]].some((joint) => perClaim[j].has(joint));
      if (!shared) {
        return [...new Set([...perClaim[i], ...perClaim[j]])].slice(0, 3);
      }
    }
  }
  return [];
}

export function detectMixedSense(normalizedLabel: string, claimTexts: string[]): string[] {
  // Elided labels only (bare or trailing: "radial", "posterior tibial").
  // Non-elided labels carry their own head noun; incidental co-mentions in
  // their claims are not sense divergence.
  if (!isElidedLabel(normalizedLabel)) return [];
  // Per-claim divergence: flag only when two claims carry DISJOINT
  // disambiguator sets ("radial nerve" in one claim, "radial tear" in
  // another). Co-occurrence inside one claim ("femoral neck fracture")
  // is same-sense context, not divergence.
  const perClaim = claimTexts.map((text) => {
    const lower = text.toLowerCase();
    return new Set(SENSE_DISAMBIGUATORS.filter((noun) => lower.includes(noun)));
  });
  for (let i = 0; i < perClaim.length; i++) {
    if (perClaim[i].size === 0) continue;
    for (let j = i + 1; j < perClaim.length; j++) {
      if (perClaim[j].size === 0) continue;
      const shared = [...perClaim[i]].some((noun) => perClaim[j].has(noun));
      if (!shared) {
        return [...new Set([...perClaim[i], ...perClaim[j]])].slice(0, 3);
      }
    }
  }
  return [];
}

/** Count-qualified or clause-shaped labels that depend on card context:
 * "8 pulleys", "Interosseous x4", "2 positive synovial culture",
 * "Removing < 1 year from implantation". Anatomical ranges ("C7-T3",
 * "1st metatarsal") are excluded. */
const ANATOMICAL_RANGE_RE = /\b[ctls]\d{1,2}(-[ctls]?\d{1,2})?\b|\b\d(st|nd|rd|th) (metacarpal|metatarsal|mc|mt|toe|finger|rib)\b/i;
const COUNT_QUALIFIED_RE = /(^|\s)\d+\s+[a-z]+|\bx\d+\b/i;
const VERB_ING_CLAUSE_RE = /^(removing|placing|using|following|showing|presenting|undergoing|performing)\b/i;

export function isContextShapedLabel(preferredLabel: string): boolean {
  if (ANATOMICAL_RANGE_RE.test(preferredLabel)) return false;
  return (
    COUNT_QUALIFIED_RE.test(preferredLabel)
    || (VERB_ING_CLAUSE_RE.test(preferredLabel) && preferredLabel.length > 15)
  );
}

/** Composite conjunctions ("DIPJ and distal phalanx") name two referents and
 * can never be one canonical node. Slash compounds ("AO/OTA") are excluded:
 * slashes join eponyms and scale names, not referents. */
const COMPOSITE_CONJUNCTION_RE = /\band\b|&|;/i;

export function isCompositeLabel(preferredLabel: string): boolean {
  return COMPOSITE_CONJUNCTION_RE.test(preferredLabel);
}

/** Relational location phrases ("insertion of X", "medial to X") describe a
 * relation, not a referent, and can never alias. ("Sides of X" is excluded:
 * it still denotes X's part and may alias via the partitive exemption.) */
const LOCATION_DESCRIPTOR_RE =
  /^(insertion of|origin of|medial to|lateral to|anterior to|posterior to|proximal to|distal to|superior to|inferior to|deep to|superficial to)\b/i;

export function isLocationDescriptorLabel(preferredLabel: string): boolean {
  return LOCATION_DESCRIPTOR_RE.test(preferredLabel);
}

/** Bare grades without a parent system ("Stage III", "Type II", "Complete
 * tear") cannot stand alone: grade OF what, tear OF what. Structured labels
 * ("Garden type II", "rotator cuff tear") never match: the pattern is
 * anchored to the full label. */
const BARE_QUALIFIER_RE =
  /^(complete|partial|full|full-thickness|partial-thickness|high-grade|low-grade)[- ]?(thickness )?(tear|tears|rupture)s?$|^(grade|stage|type)\s+[ivx0-9]+$/i;

export function isBareQualifierLabel(preferredLabel: string): boolean {
  return BARE_QUALIFIER_RE.test(preferredLabel.trim());
}

function isGenericSeed(normalized: string): boolean {
  return (GENERIC_PHRASE_SEEDS as readonly string[]).includes(normalized);
}

function hasDeictic(normalized: string): boolean {
  return (DEICTIC_PHRASE_SEEDS as readonly string[]).some((seed) => normalized.includes(seed));
}

function labelTokenCount(normalized: string): number {
  return normalized.split(" ").filter(Boolean).length;
}

export function recommendDisposition(
  proposal: PacketProposal,
  context: PacketContext,
): DispositionRecommendation {
  const normalized = proposal.normalizedLabel.toLowerCase().trim();
  const [top] = context.candidates;
  const inferred = context.inferredType;

  // 1. Exact canonical duplicate -> alias (repoint, never a new canonical).
  if (top && top.signals.exactLabel) {
    const typeNote = top.signals.typeCompatible ? "" : " with type correction";
    return {
      disposition: "ALIAS_EXISTING",
      confidence: top.signals.typeCompatible ? 0.95 : 0.85,
      reason: `exact_normalized_label_match${typeNote}`,
      recommendedTargetId: top.entityId,
      recommendedType: top.type,
      needsFullDbRecheck: false,
    };
  }
  // 2. Reviewed-alias hit -> alias.
  if (top && top.signals.aliasMatch) {
    return {
      disposition: "ALIAS_EXISTING",
      confidence: 0.9,
      reason: "reviewed_alias_match",
      recommendedTargetId: top.entityId,
      recommendedType: top.type,
      needsFullDbRecheck: false,
    };
  }
  // 3. Intrinsic rejects: verb fragments, deictic phrases, generic seeds.
  if (inferred.flags.includes("likely_verb_fragment")) {
    return {
      disposition: "REJECT_NON_ENTITY",
      confidence: 0.85,
      reason: "verb_fragment_answer_token",
      needsFullDbRecheck: false,
    };
  }
  if (hasDeictic(normalized)) {
    return {
      disposition: "REJECT_CONTEXT_DEPENDENT",
      confidence: 0.85,
      reason: "deictic_card_referential_phrase",
      needsFullDbRecheck: false,
    };
  }
  if (isContextShapedLabel(proposal.preferredLabel)) {
    return {
      disposition: "REJECT_CONTEXT_DEPENDENT",
      confidence: 0.7,
      reason: "count_or_clause_shaped_label",
      needsFullDbRecheck: false,
    };
  }
  if (isCompositeLabel(proposal.preferredLabel)) {
    return {
      disposition: "REJECT_CONTEXT_DEPENDENT",
      confidence: 0.7,
      reason: "composite_conjunction_label",
      needsFullDbRecheck: false,
    };
  }
  if (isLocationDescriptorLabel(proposal.preferredLabel)) {
    return {
      disposition: "REJECT_CONTEXT_DEPENDENT",
      confidence: 0.7,
      reason: "location_descriptor_label",
      needsFullDbRecheck: false,
    };
  }
  if (isBareQualifierLabel(proposal.preferredLabel)) {
    return {
      disposition: "REJECT_CONTEXT_DEPENDENT",
      confidence: 0.75,
      reason: "bare_qualifier_missing_parent",
      needsFullDbRecheck: false,
    };
  }
  // Generic seeds reject unless an exact/alias/strong candidate already
  // exists (rules 1-2 above, rule 4 below). Weak fuzzy candidates must not
  // rescue "Infection" into a new canonical.
  if (isGenericSeed(normalized) && (!top || top.score < 0.8)) {
    return {
      disposition: "REJECT_TOO_GENERIC",
      confidence: 0.75,
      reason: "generic_seed_no_canonical_target",
      needsFullDbRecheck: true,
    };
  }
  if (/^(true|false|yes|no)[!.]?$/i.test(proposal.preferredLabel.trim())) {
    return {
      disposition: "REJECT_NON_ENTITY",
      confidence: 0.9,
      reason: "boolean_answer_token",
      needsFullDbRecheck: false,
    };
  }
  // 4. Strong fuzzy candidate -> alias, EXCEPT single-token elision-driven
  // matches: bare adjectives ("posterolateral", "interosseous") share high
  // lexical similarity with same-prefix structures they are not ("ACL
  // bundle" vs "posterolateral corner"). Those route to the context-gated
  // rule 7 / defer path instead.
  const singleToken = labelTokenCount(normalizeEntityLabelForMatch(proposal.preferredLabel)) < 2;
  if (top && top.score >= 0.8 && !(singleToken && top.signals.elision)) {
    return {
      disposition: "ALIAS_EXISTING",
      confidence: 0.75,
      reason: `strong_candidate_score_${top.score.toFixed(2)}`,
      recommendedTargetId: top.entityId,
      recommendedType: top.type,
      needsFullDbRecheck: false,
    };
  }
  // 5. Non-head cluster member -> merge into head.
  if (context.cluster && !context.isClusterHead) {
    return {
      disposition: "MERGE_PROPOSALS",
      confidence: 0.8,
      reason: `duplicate_cluster_member_${context.cluster.linkReasons.join("+") || "variant"}`,
      needsFullDbRecheck: true,
    };
  }
  // 6. Multi-sense elided forms -> defer (never guess the sense). Gated on
  // elided labels: incidental anatomical co-mentions in other labels'
  // claims ("varus" + "talar neck fracture") are not sense divergence.
  const mixedSenses = detectMixedSense(normalized, context.claimTexts);
  const jointSplit = isShortAcronymLike(normalized)
    ? detectJointDivergence(context.claimTexts)
    : [];
  const divergences = mixedSenses.length > 0 ? mixedSenses : jointSplit;
  if (divergences.length > 0 && (isElidedLabel(normalized) || jointSplit.length > 0)) {
    return {
      disposition: "DEFER_NEEDS_REVIEW",
      confidence: 0.7,
      reason: `multi_sense_risk_${divergences.slice(0, 3).join("+")}`,
      needsFullDbRecheck: true,
    };
  }
  // 7. Moderate candidate + consistent context -> alias; else defer.
  if (top && top.score >= 0.55) {
    if (top.signals.elision && inferred.flags.includes("ambiguous_elision")) {
      // Elided forms often tie several same-prefix candidates ("Femoral
      // Head" vs "Femoral nerve"). With innervation context, search ALL
      // candidates for the unique nerve — never trust tie order.
      const innervation = context.claimTexts.join(" ").toLowerCase().includes("innervat");
      const nerveCands = context.candidates.filter(
        (candidate) => candidate.score >= 0.55 && /\bnerve\b/i.test(candidate.label),
      );
      if (innervation && nerveCands.length === 1) {
        return {
          disposition: "ALIAS_EXISTING",
          confidence: 0.7,
          reason: "elided_nerve_form_with_innervation_context",
          recommendedTargetId: nerveCands[0].entityId,
          recommendedType: nerveCands[0].type,
          needsFullDbRecheck: false,
        };
      }
      if (!innervation || nerveCands.length > 1) {
        return {
          disposition: "DEFER_NEEDS_REVIEW",
          confidence: 0.6,
          reason: "ambiguous_elision_needs_sense_review",
          recommendedTargetId: top.entityId,
          needsFullDbRecheck: true,
        };
      }
      // Innervation context but no nerve candidate in the partial index:
      // fall through to rule 8 and promote the expanded "{Label} nerve".
    } else if (singleToken && top.signals.elision) {
      // Single-token elision without the innervation+nerve gate (e.g.
      // "interosseous" vs "interosseous membrane"): lexically close but
      // anatomically unproven — defer, never moderate-alias.
      return {
        disposition: "DEFER_NEEDS_REVIEW",
        confidence: 0.6,
        reason: "single_token_elision_needs_sense_review",
        recommendedTargetId: top.entityId,
        needsFullDbRecheck: true,
      };
    } else if (top.score >= 0.65 || top.signals.acronymExpansion) {
      return {
        disposition: "ALIAS_EXISTING",
        confidence: 0.6,
        reason: `moderate_candidate_score_${top.score.toFixed(2)}`,
        recommendedTargetId: top.entityId,
        recommendedType: top.type,
        needsFullDbRecheck: false,
      };
    }
    // Below-threshold fuzzy matches ("posterior oblique ligament" vs PCL
    // at 0.55) fall through to rule 8 (promote/defer on intrinsic merit)
    // instead of moderate-aliasing.
  }
  // Unexpanded short acronyms with no usable candidate need expert expansion
  // ("MRI" -> magnetic resonance imaging), never a bare-acronym canonical —
  // even when the type signal is strong ("ORIF" is fixation_method).
  if ((!top || top.score < 0.55) && looksLikeAcronym(proposal.preferredLabel)) {
    return {
      disposition: "DEFER_NEEDS_REVIEW",
      confidence: 0.6,
      reason: "acronym_needs_expansion_review",
      recommendedType: inferred.type,
      needsFullDbRecheck: true,
    };
  }
  // 8. No candidate: promotion-worthy vs defer.
  const contextDisambiguated = inferred.reasons.includes("innervation_context_disambiguation");
  const strongLexical = (!inferred.flags.includes("prior_fallback") || contextDisambiguated)
    && inferred.confidence >= 0.8;
  const multiToken = labelTokenCount(normalized) >= 2;
  const supported = proposal.claimIds.length >= 2 || proposal.cardIds.length >= 2;
  if ((strongLexical || multiToken) && (supported || strongLexical) && normalized.length >= 4) {
    // Elided adjectives disambiguated by context promote under the EXPANDED
    // label ("Tibial" -> "Tibial nerve"), never the bare modifier.
    let canonicalLabel = proposal.preferredLabel;
    let recommendedType = inferred.type;
    let reason = supported ? "reusable_label_multi_claim_support" : "reusable_label_single_claim";
    if (
      isElidedLabel(normalized)
      && inferred.reasons.includes("innervation_context_disambiguation")
    ) {
      canonicalLabel = `${proposal.preferredLabel} nerve`;
      recommendedType = "anatomy_structure";
      reason += "_expanded_elided_nerve";
    }
    return {
      disposition: "PROMOTE_CANONICAL",
      confidence: supported ? 0.7 : 0.55,
      reason,
      recommendedCanonicalLabel: canonicalLabel,
      recommendedType,
      needsFullDbRecheck: true,
    };
  }
  return {
    disposition: "DEFER_NEEDS_REVIEW",
    confidence: 0.5,
    reason: "low_support_ambiguous_label",
    recommendedType: inferred.type,
    needsFullDbRecheck: true,
  };
}

/** Impact ranking: claim support first, then card spread, then cheap wins
 * (exact/alias candidates resolve without new canonicals). */
export function impactScore(
  proposal: PacketProposal,
  recommendation: DispositionRecommendation,
  cluster?: ProposalCluster,
): number {
  let score = proposal.claimIds.length * 3 + proposal.cardIds.length * 2;
  if (proposal.cardIds.length >= 3) score += 4;
  if (recommendation.disposition === "ALIAS_EXISTING") score += 5;
  if (cluster && cluster.memberIds.length >= 3) score += 3;
  if (recommendation.disposition === "PROMOTE_CANONICAL" && proposal.claimIds.length >= 3) {
    score += 2;
  }
  return score;
}

export function buildReviewRow(proposal: PacketProposal, context: PacketContext): ReviewRow {
  const recommendation = recommendDisposition(proposal, context);
  // Show the recommended target first so the reviewer never acts on a
  // same-score tie rival (e.g. "Femoral Head" above "Femoral nerve").
  const ordered = [...context.candidates].sort((a, b) => {
    const aTarget = a.entityId === recommendation.recommendedTargetId ? 0 : 1;
    const bTarget = b.entityId === recommendation.recommendedTargetId ? 0 : 1;
    if (aTarget !== bTarget) return aTarget - bTarget;
    return b.score - a.score;
  });
  return {
    proposalId: proposal.entityId,
    proposedLabel: proposal.preferredLabel,
    proposedType: proposal.factoryType,
    inferredType: context.inferredType.type,
    inferredTypeConfidence: context.inferredType.confidence,
    claimCount: proposal.claimIds.length,
    cardCount: proposal.cardIds.length,
    tags: proposal.tags,
    exampleClaims: context.claimTexts.slice(0, 3),
    neighborLabels: [...new Set(context.neighborLabels)].slice(0, 8),
    bestCandidates: ordered.slice(0, 3).map((candidate) => ({
      entityId: candidate.entityId,
      label: candidate.label,
      type: candidate.type,
      score: candidate.score,
      evidence: candidate.evidence,
    })),
    clusterId: context.cluster?.clusterId,
    clusterSize: context.cluster?.memberIds.length,
    clusterHeadLabel: undefined,
    recommendation,
    impactScore: impactScore(proposal, recommendation, context.cluster),
  };
}

export function rankReviewRows(rows: ReviewRow[]): ReviewRow[] {
  return [...rows].sort((a, b) => {
    if (a.impactScore !== b.impactScore) return b.impactScore - a.impactScore;
    if (a.claimCount !== b.claimCount) return b.claimCount - a.claimCount;
    return a.proposalId.localeCompare(b.proposalId);
  });
}

const CSV_COLUMNS = [
  "proposal_id",
  "proposed_label",
  "proposed_type",
  "inferred_type",
  "inferred_type_confidence",
  "claim_count",
  "card_count",
  "tags",
  "example_claim_1",
  "example_claim_2",
  "best_candidate_label",
  "best_candidate_score",
  "best_candidate_evidence",
  "cluster_size",
  "recommended_disposition",
  "confidence",
  "reason",
  "recommended_canonical_label",
  "recommended_type",
  "recommended_target_id",
  "needs_full_db_recheck",
  "impact_score",
] as const;

function csvCell(value: string | number | undefined): string {
  if (value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reviewRowToCsv(row: ReviewRow): string {
  const [best] = row.bestCandidates;
  const cells: Array<string | number | undefined> = [
    row.proposalId,
    row.proposedLabel,
    row.proposedType,
    row.inferredType,
    row.inferredTypeConfidence,
    row.claimCount,
    row.cardCount,
    row.tags.join("|"),
    row.exampleClaims[0],
    row.exampleClaims[1],
    best?.label,
    best?.score,
    best?.evidence.join("|"),
    row.clusterSize,
    row.recommendation.disposition,
    row.recommendation.confidence,
    row.recommendation.reason,
    row.recommendation.recommendedCanonicalLabel,
    row.recommendation.recommendedType,
    row.recommendation.recommendedTargetId,
    row.recommendation.needsFullDbRecheck ? "true" : "false",
    row.impactScore,
  ];
  return cells.map(csvCell).join(",");
}

export function reviewCsvHeader(): string {
  return CSV_COLUMNS.join(",");
}
