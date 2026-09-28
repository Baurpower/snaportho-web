/** Multi-signal proposed → canonical candidate matching (Step 7).
 *
 * Signals: exact normalized label, alias match, token overlap, trigram
 * similarity, entity-type compatibility, acronym↔expansion, elision, and
 * claim co-occurrence. No embeddings. Scores are deterministic and every
 * candidate carries its evidence for the reviewer.
 *
 * IMPORTANT: offline runs use a partial canonical index. A missing candidate
 * never proves novelty — PROMOTE recommendations must be re-checked against
 * the full database at apply time (see promotion-applier fail-closed rule).
 */

import {
  entityMatchKeys,
  normalizeEntityLabelForMatch,
  tokenContainment,
  tokenJaccard,
  trigramSimilarity,
} from "./entity-label-normalization";

export const CANDIDATE_MATCHER_VERSION = "canonical-candidate-matcher.v1" as const;

export type CanonicalRef = {
  id: string;
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  aliases: string[];
};

export type AliasRef = {
  aliasNormalized: string;
  canonicalEntityId: string;
  aliasType: string;
};

export type ProposalMatchInput = {
  entityId: string;
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  claimIds: string[];
  /** True when the proposal type came from a strong lexical rule (not the
   * condition prior). Confident pathology types veto structure targets. */
  proposalTypeConfident?: boolean;
};

export type ClaimCooccurrence = {
  /** Other normalized entity labels linked on each claim. */
  claimNeighborLabels: Map<string, string[]>;
  /** Claims each canonical entity is already linked to. */
  canonicalClaimIds: Map<string, Set<string>>;
};

export type CandidateSignals = {
  exactLabel: boolean;
  aliasMatch: boolean;
  tokenJaccard: number;
  tokenContainment: number;
  trigram: number;
  typeCompatible: boolean;
  acronymExpansion: boolean;
  elision: boolean;
  claimOverlap: number;
};

export type CanonicalCandidate = {
  entityId: string;
  label: string;
  type: string;
  signals: CandidateSignals;
  score: number;
  evidence: string[];
};

/** Types close enough to share a canonical target (e.g. a proposal typed
 * `condition` may still alias an anatomy_structure when the proposal type
 * came from the skewed factory default). Incompatibility lowers score but
 * never vetoes — the reviewer decides. */
const COMPATIBLE_TYPE_PAIRS: ReadonlySet<string> = new Set([
  "condition|complication",
  "condition|anatomy_structure",
  "imaging_finding|diagnostic_test",
  "procedure|fixation_method",
  "procedure|surgical_approach",
  "classification_system|classification_grade",
  "condition|biomechanics_concept",
]);

export function typesCompatible(left: string, right: string): boolean {
  if (left === right) return true;
  return (
    COMPATIBLE_TYPE_PAIRS.has(`${left}|${right}`) || COMPATIBLE_TYPE_PAIRS.has(`${right}|${left}`)
  );
}

function initialsOf(normalized: string): string {
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0])
    .join("");
}

function isAcronymExpansion(proposalNorm: string, canonicalNorm: string): boolean {
  const pTokens = proposalNorm.split(" ").filter(Boolean);
  const cTokens = canonicalNorm.split(" ").filter(Boolean);
  // One side single token, other side multi-token with matching initials.
  if (pTokens.length === 1 && cTokens.length > 1) return initialsOf(canonicalNorm) === pTokens[0];
  if (cTokens.length === 1 && pTokens.length > 1) return initialsOf(proposalNorm) === cTokens[0];
  return false;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Pathology classes: a confidently-typed pathology proposal must never alias
 * to a non-pathology canonical ("AIN palsy" is not "AIN"). */
const PATHOLOGY_TYPES: ReadonlySet<string> = new Set([
  "condition",
  "complication",
  "imaging_finding",
]);

/** Antonym substitutions that veto a candidate outright: same token count,
 * one substituted pair ("posterior" vs "anterior interosseous nerve"). */
const ANTONYM_PAIRS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(["anterior", "posterior"]),
  new Set(["medial", "lateral"]),
  new Set(["superior", "inferior"]),
  new Set(["proximal", "distal"]),
  new Set(["deep", "superficial"]),
  new Set(["flexor", "extensor"]),
  new Set(["internal", "external"]),
  new Set(["left", "right"]),
  new Set(["upper", "lower"]),
  new Set(["dorsal", "volar"]),
  new Set(["dorsal", "palmar"]),
  new Set(["radial", "ulnar"]),
  new Set(["varus", "valgus"]),
  new Set(["flexion", "extension"]),
  new Set(["abduction", "adduction"]),
  new Set(["pronation", "supination"]),
  new Set(["inversion", "eversion"]),
];

function isAntonymSubstitution(left: string[], right: string[]): boolean {
  if (left.length !== right.length || left.length === 0) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const leftOnly = left.filter((token) => !rightSet.has(token));
  const rightOnly = right.filter((token) => !leftSet.has(token));
  if (leftOnly.length !== 1 || rightOnly.length !== 1) return false;
  return ANTONYM_PAIRS.some((pair) => pair.has(leftOnly[0]!) && pair.has(rightOnly[0]!));
}

/** Generic partitives exempt from the hyponym veto ("middle phalanges of
 * digits" still refers to the middle phalanx). */
const GENERIC_PARTITIVES: ReadonlySet<string> = new Set([
  "of",
  "digits",
  "fingers",
  "toes",
  "hand",
  "hands",
  "foot",
  "feet",
  "side",
  "sides",
]);

/** Region/direction qualifiers that mark part-of containment, not elision. */
const REGION_QUALIFIERS: ReadonlySet<string> = new Set([
  "proximal",
  "distal",
  "medial",
  "lateral",
  "anterior",
  "posterior",
  "superior",
  "inferior",
  "dorsal",
  "volar",
  "palmar",
  "plantar",
  "upper",
  "lower",
  "mid",
  "middle",
]);

/** Joint/region specifiers: a longer canonical carrying one is MORE specific
 * than the proposal ("articular cartilage" vs "knee articular cartilage"). */
const ANATOMICAL_SPECIFIERS: ReadonlySet<string> = new Set([
  ...REGION_QUALIFIERS,
  "knee",
  "hip",
  "shoulder",
  "elbow",
  "wrist",
  "ankle",
  "hand",
  "foot",
  "spine",
]);

function scoreCandidate(
  signals: CandidateSignals,
  proposalType: string,
  canonicalType: string,
  proposalTypeConfident: boolean,
): { score: number; evidence: string[] } {
  const evidence: string[] = [];
  let score = 0;
  // Confident pathology proposals never alias to structures: "AIN palsy"
  // is a condition, "AIN" is a nerve. Non-confident (prior-fallback) types
  // keep skew tolerance.
  if (
    proposalTypeConfident
    && PATHOLOGY_TYPES.has(proposalType)
    && !PATHOLOGY_TYPES.has(canonicalType)
  ) {
    score -= 0.5;
    evidence.push("confident_pathology_mismatch");
  }
  if (signals.exactLabel) {
    score += 1.0;
    evidence.push("exact_normalized_label");
  }
  if (signals.aliasMatch) {
    score += 0.9;
    evidence.push("alias_match");
  }
  if (signals.acronymExpansion) {
    score += 0.55;
    evidence.push("acronym_expansion");
  }
  if (signals.elision) {
    score += 0.35;
    evidence.push("elided_form_containment");
  }
  if (signals.trigram >= 0.85) {
    score += 0.4;
    evidence.push(`trigram_${signals.trigram.toFixed(2)}`);
  } else if (signals.trigram >= 0.7) {
    score += 0.2;
    evidence.push(`trigram_${signals.trigram.toFixed(2)}`);
  }
  if (signals.tokenJaccard >= 0.5) {
    score += 0.25;
    evidence.push(`token_jaccard_${signals.tokenJaccard.toFixed(2)}`);
  }
  if (signals.claimOverlap >= 0.5) {
    score += 0.2;
    evidence.push(`claim_overlap_${signals.claimOverlap.toFixed(2)}`);
  } else if (signals.claimOverlap > 0) {
    score += 0.1;
    evidence.push(`claim_overlap_${signals.claimOverlap.toFixed(2)}`);
  }
  if (signals.typeCompatible) {
    score += 0.1;
    evidence.push("type_compatible");
  } else {
    score -= 0.15;
    evidence.push("type_mismatch");
  }
  return { score: round3(Math.max(0, score)), evidence };
}

export function matchProposedToCanonical(
  proposal: ProposalMatchInput,
  canonicalIndex: CanonicalRef[],
  aliases: AliasRef[] = [],
  cooccurrence?: ClaimCooccurrence,
  limit = 3,
): CanonicalCandidate[] {
  const proposalKeys = entityMatchKeys(proposal.preferredLabel);
  if (proposal.normalizedLabel) proposalKeys.push(proposal.normalizedLabel);
  const proposalKeySet = new Set(proposalKeys);
  const aliasByNorm = new Map<string, AliasRef[]>();
  for (const alias of aliases) {
    const list = aliasByNorm.get(alias.aliasNormalized) ?? [];
    list.push(alias);
    aliasByNorm.set(alias.aliasNormalized, list);
  }
  const candidates: CanonicalCandidate[] = [];
  for (const canonical of canonicalIndex) {
    const canonicalKeys = entityMatchKeys(canonical.preferredLabel);
    if (canonical.normalizedLabel) canonicalKeys.push(canonical.normalizedLabel);
    const canonicalKeySet = new Set(canonicalKeys);
    let exactLabel = false;
    for (const key of proposalKeySet) {
      if (canonicalKeySet.has(key)) {
        exactLabel = true;
        break;
      }
    }
    let aliasMatch = false;
    for (const key of proposalKeySet) {
      const hits = aliasByNorm.get(key) ?? [];
      if (hits.some((hit) => hit.canonicalEntityId === canonical.id)) {
        aliasMatch = true;
        break;
      }
    }
    // Canonical rows may also carry inline aliases (offline index form).
    if (!aliasMatch) {
      for (const inline of canonical.aliases ?? []) {
        const inlineKeys = entityMatchKeys(inline);
        if (inlineKeys.some((key) => proposalKeySet.has(key))) {
          aliasMatch = true;
          break;
        }
      }
    }
    // Token/trigram metrics run on match-normalized forms: factory
    // normalized labels may retain hyphens ("radial-pin") that would
    // otherwise zero out token overlap with "pin".
    const proposalNorm = normalizeEntityLabelForMatch(proposal.preferredLabel)
      || proposal.normalizedLabel
      || proposalKeys[0]
      || "";
    const canonicalNorm = normalizeEntityLabelForMatch(canonical.preferredLabel)
      || canonical.normalizedLabel
      || canonicalKeys[0]
      || "";
    const jaccard = tokenJaccard(proposalNorm, canonicalNorm);
    const containment = tokenContainment(proposalNorm, canonicalNorm);
    const trigram = trigramSimilarity(proposalNorm, canonicalNorm);
    const acronymExpansion = isAcronymExpansion(proposalNorm, canonicalNorm);
    const proposalTokenList = proposalNorm.split(" ").filter(Boolean);
    const canonicalTokenList = canonicalNorm.split(" ").filter(Boolean);
    // Region-qualified part-of pairs ("humerus" vs "proximal humerus") share
    // containment but are NOT elisions: the whole bone is not an alias of
    // its proximal part. Elision requires a non-region head difference
    // ("femoral" vs "femoral nerve").
    const longer = proposalTokenList.length >= canonicalTokenList.length
      ? proposalTokenList
      : canonicalTokenList;
    const shorterSet = new Set(
      proposalTokenList.length >= canonicalTokenList.length ? canonicalTokenList : proposalTokenList,
    );
    const extraTokens = longer.filter((token) => !shorterSet.has(token));
    // ANY region qualifier among the extras marks part-of/specificity, not
    // elision: "humerus" vs "proximal humerus" (part), "lateral femoral
    // cutaneous nerve" vs "femoral nerve" (distinct nerve).
    const partOfRegion = extraTokens.length > 0
      && extraTokens.some((token) => REGION_QUALIFIERS.has(token));
    const elision = !exactLabel
      && containment === 1
      && Math.abs(proposalTokenList.length - canonicalTokenList.length) >= 1
      && !partOfRegion;
    // Hard vetoes (reviewed exact/alias truth always wins over vetoes):
    // 1. antonym substitution ("posterior" vs "anterior interosseous nerve");
    // 2. hyponym: longer proposal contained in a multi-token canonical
    //    ("facet joint capsules" vs "joint capsule"), except acronym
    //    relations and generic partitives ("middle phalanges of digits");
    // 3. generic proposal vs specifying canonical ("articular cartilage"
    //    vs "knee articular cartilage").
    if (!exactLabel && !aliasMatch) {
      if (isAntonymSubstitution(proposalTokenList, canonicalTokenList)) continue;
      if (
        proposalTokenList.length > canonicalTokenList.length
        && canonicalTokenList.length > 1
        && containment === 1
        && !acronymExpansion
        && !extraTokens.every((token) => GENERIC_PARTITIVES.has(token))
      ) {
        continue;
      }
      if (
        canonicalTokenList.length > proposalTokenList.length
        && containment === 1
        && extraTokens.some((token) => ANATOMICAL_SPECIFIERS.has(token))
      ) {
        continue;
      }
    }
    let claimOverlap = 0;
    if (cooccurrence && proposal.claimIds.length > 0) {
      const canonicalClaims = cooccurrence.canonicalClaimIds.get(canonical.id);
      if (canonicalClaims && canonicalClaims.size > 0) {
        let shared = 0;
        for (const claimId of proposal.claimIds) if (canonicalClaims.has(claimId)) shared++;
        claimOverlap = round3(shared / proposal.claimIds.length);
      }
    }
    const signals: CandidateSignals = {
      exactLabel,
      aliasMatch,
      tokenJaccard: round3(jaccard),
      tokenContainment: round3(containment),
      trigram: round3(trigram),
      typeCompatible: typesCompatible(proposal.entityType, canonical.entityType),
      acronymExpansion,
      elision,
      claimOverlap,
    };
    // Prefilter noise: keep exact/alias hits plus plausible fuzzy candidates.
    const plausible =
      exactLabel || aliasMatch || acronymExpansion || trigram >= 0.6 || jaccard >= 0.34 || claimOverlap >= 0.5;
    if (!plausible) continue;
    const { score, evidence } = scoreCandidate(
      signals,
      proposal.entityType,
      canonical.entityType,
      proposal.proposalTypeConfident ?? false,
    );
    candidates.push({
      entityId: canonical.id,
      label: canonical.preferredLabel,
      type: canonical.entityType,
      signals,
      score,
      evidence,
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}
