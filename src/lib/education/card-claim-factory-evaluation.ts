import { normalizeClinicalText, type EntityIndexRow } from "./deck-semantic-mapping";
import { assessEntityLikeness } from "./card-claim-factory";
import type {
  CanonicalMatchAttempt,
  CardClaimFactoryOutput,
  EntityLikenessReason,
  ProposedOntologyEntity,
  SpecificityReason,
} from "./card-claim-factory";

export const EVALUATION_CONTRACT_VERSION = "snaportho-card-claim-evaluation.v1" as const;
export const REVIEW_PACKET_CONTRACT_VERSION = "snaportho-ontology-review-packet.v1" as const;
export const PROMOTION_PLAN_CONTRACT_VERSION = "snaportho-ontology-promotion-plan.v1" as const;

export type EvaluationMode = "live" | "fixture";

export type CanonicalDuplicateMatchReason =
  | "normalized_exact"
  | "alias_exact"
  | "punct_case_variant"
  | "token_equivalent"
  | "singular_plural_variant";

export type CanonicalDuplicateFlag = {
  canonicalEntityId: string;
  preferredLabel: string;
  matchReason: CanonicalDuplicateMatchReason;
};

export type ProposedDuplicateFlag = {
  otherProposedEntityId: string;
  otherPreferredLabel: string;
  reason: string;
  similarity: number;
};

export type ProposedOntologyEntityEvaluation = {
  proposedEntityId: string;
  entityType: string;
  preferredLabel: string;
  normalizedLabel: string;
  confidence: number;
  derivation: string;
  sourceCardIds: string[];
  sourceCards: Array<{ canonicalCardId: string; rawClozeAnswer: string }>;
  numberOfCards: number;
  canonicalMatchAttempts: CanonicalMatchAttempt[];
  claimIds: string[];
  teachesLinksCreated: number;
  possibleDuplicateCanonicalEntities: CanonicalDuplicateFlag[];
  entityLike: boolean;
  entityLikenessReasons: EntityLikenessReason[];
  contextuallySpecific: true | false | "uncertain";
  specificityReasons: SpecificityReason[];
};

export type BlockedProposalEvaluation = {
  canonicalCardId: string;
  noteGuid: string;
  rawClozeAnswer: string;
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  derivation: string;
  confidence: number;
  claimId: string | null;
  entityLike: boolean;
  entityLikenessReasons: EntityLikenessReason[];
  contextuallySpecific: true | false | "uncertain";
  specificityReasons: SpecificityReason[];
  specificityAnchor: string | null;
  reasonCodes: string[];
};

export type UnresolvedCardEvaluation = {
  canonicalCardId: string;
  noteGuid: string;
  rawClozeAnswer: string;
  normalizedAnswer: string;
  reasonCodes: string[];
  unresolvedReason: string;
};

export type CardClaimFactoryEvaluation = {
  contractVersion: typeof EVALUATION_CONTRACT_VERSION;
  runId: string;
  mode: EvaluationMode;
  generatedAt: string;
  cardsProcessed: number;
  claimsProduced: number;
  canonicalEntityMatches: number;
  ontologyGapFilledCards: number;
  proposedEntitiesCreated: number;
  proposedEntitiesReused: number;
  cardsAttachedToProposedEntities: number;
  autoApproved: number;
  manualReview: number;
  unresolved: {
    total: number;
    shortLabelInsufficientContext: number;
    other: number;
  };
  proposedEntities: ProposedOntologyEntityEvaluation[];
  blockedProposals: BlockedProposalEvaluation[];
  unresolvedCards: UnresolvedCardEvaluation[];
};

const RETIRED_LIFECYCLE = new Set(["deprecated", "replaced", "merged", "split"]);

function activeCanonicalEntities(entities: EntityIndexRow[]): EntityIndexRow[] {
  return entities.filter((entity) => entity.active && !RETIRED_LIFECYCLE.has(entity.lifecycleStatus));
}

function tokensOf(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

function singularForm(token: string): string {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1);
  return token;
}

function sameTokensMetric(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / Math.max(setA.size, setB.size, 1);
}

function foldPunct(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Review-only second pass: flags a proposed entity that looks like an existing
 * canonical entity. Advisory only — never alters resolution, claims, or links.
 */
export function auditCanonicalSimilarity(
  proposed: Pick<ProposedOntologyEntity, "normalizedLabel" | "preferredLabel">,
  entities: EntityIndexRow[],
): CanonicalDuplicateFlag[] {
  const flags: CanonicalDuplicateFlag[] = [];
  const proposedNormalized = normalizeClinicalText(proposed.normalizedLabel);
  const proposedTokens = tokensOf(proposedNormalized);
  const proposedSingular = proposedTokens.map(singularForm);
  for (const entity of activeCanonicalEntities(entities)) {
    const canonicalNormalized = normalizeClinicalText(entity.normalizedLabel);
    if (canonicalNormalized === proposedNormalized) {
      flags.push({ canonicalEntityId: entity.id, preferredLabel: entity.preferredLabel, matchReason: "normalized_exact" });
      continue;
    }
    const aliasHit = [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases]
      .map(normalizeClinicalText)
      .includes(proposedNormalized);
    if (aliasHit) {
      flags.push({ canonicalEntityId: entity.id, preferredLabel: entity.preferredLabel, matchReason: "alias_exact" });
      continue;
    }
    if (foldPunct(entity.preferredLabel) === foldPunct(proposed.preferredLabel)) {
      flags.push({ canonicalEntityId: entity.id, preferredLabel: entity.preferredLabel, matchReason: "punct_case_variant" });
      continue;
    }
    const canonicalTokens = tokensOf(canonicalNormalized);
    if (
      canonicalTokens.length === proposedTokens.length
      && [...canonicalTokens].sort().join(" ") === [...proposedTokens].sort().join(" ")
    ) {
      flags.push({ canonicalEntityId: entity.id, preferredLabel: entity.preferredLabel, matchReason: "token_equivalent" });
      continue;
    }
    const canonicalSingular = canonicalTokens.map(singularForm);
    if (
      canonicalSingular.length === proposedSingular.length
      && [...canonicalSingular].sort().join(" ") === [...proposedSingular].sort().join(" ")
    ) {
      flags.push({ canonicalEntityId: entity.id, preferredLabel: entity.preferredLabel, matchReason: "singular_plural_variant" });
    }
  }
  return flags.sort((left, right) => left.canonicalEntityId.localeCompare(right.canonicalEntityId));
}

function initialsOf(label: string): string {
  return tokensOf(normalizeClinicalText(label)).map((token) => token.charAt(0)).join("");
}

/**
 * Review-only near-duplicate audit across proposed entities. Exact
 * type + normalized-label duplicates are already merged by the factory; this
 * pass only flags lookalikes for human review and never merges.
 */
export function auditProposedNearDuplicates(
  entities: Array<Pick<ProposedOntologyEntity, "entityId" | "preferredLabel" | "normalizedLabel">>,
): Map<string, ProposedDuplicateFlag[]> {
  const result = new Map<string, ProposedDuplicateFlag[]>();
  const sorted = [...entities].sort((left, right) => left.entityId.localeCompare(right.entityId));
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const left = sorted[i]!;
      const right = sorted[j]!;
      if (left.entityId === right.entityId) continue;
      const leftTokens = tokensOf(normalizeClinicalText(left.normalizedLabel));
      const rightTokens = tokensOf(normalizeClinicalText(right.normalizedLabel));
      const similarity = sameTokensMetric(leftTokens, rightTokens);
      let reason: string | null = null;
      if (similarity >= 0.5) {
        reason = "token_overlap";
      } else {
        // Acronym-of-remainder: "ACL tear" vs "Anterior cruciate ligament tear"
        // share "tear"; the leftover "acl" is the initials of the other leftover.
        const rightSet = new Set(rightTokens);
        const leftSet = new Set(leftTokens);
        const leftRest = leftTokens.filter((token) => !rightSet.has(token));
        const rightRest = rightTokens.filter((token) => !leftSet.has(token));
        const leftAcronym = leftRest.length > 0 && leftRest.join("") === initialsOf(rightRest.join(" "));
        const rightAcronym = rightRest.length > 0 && rightRest.join("") === initialsOf(leftRest.join(" "));
        if ((leftRest.length > 0 && rightRest.length > 0 && (leftAcronym || rightAcronym))) {
          reason = "acronym_expansion_pair";
        }
      }
      if (!reason) continue;
      const leftFlag: ProposedDuplicateFlag = {
        otherProposedEntityId: right.entityId,
        otherPreferredLabel: right.preferredLabel,
        reason,
        similarity,
      };
      const rightFlag: ProposedDuplicateFlag = {
        otherProposedEntityId: left.entityId,
        otherPreferredLabel: left.preferredLabel,
        reason,
        similarity,
      };
      result.set(left.entityId, [...(result.get(left.entityId) ?? []), leftFlag]);
      result.set(right.entityId, [...(result.get(right.entityId) ?? []), rightFlag]);
    }
  }
  return result;
}

function gapMetadata(gap: CardClaimFactoryOutput["gaps"][number]): Record<string, unknown> {
  return (gap.metadata ?? {}) as Record<string, unknown>;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Pure transformation: factory output -> durable machine-readable evaluation. */
export function buildFactoryEvaluation(
  output: CardClaimFactoryOutput,
  input: { mode: EvaluationMode; entities: EntityIndexRow[]; generatedAt?: string },
): CardClaimFactoryEvaluation {
  const claimsByEntity = new Map<string, string[]>();
  for (const claim of output.proposedClaims) {
    claimsByEntity.set(claim.primaryEntityId, [...(claimsByEntity.get(claim.primaryEntityId) ?? []), claim.claimId]);
  }
  const linksByEntity = new Map<string, number>();
  for (const link of output.autoApprovedLinks) {
    const entityId = stringField((link.metadata as Record<string, unknown> | undefined)?.entityId)
      || output.proposedClaims.find((claim) => claim.claimId === link.claimId)?.primaryEntityId
      || "";
    if (entityId) linksByEntity.set(entityId, (linksByEntity.get(entityId) ?? 0) + 1);
  }
  const rawAnswerByCard = new Map<string, string>();
  for (const gap of output.gaps) {
    if (gap.canonicalCardId) rawAnswerByCard.set(gap.canonicalCardId, stringField(gapMetadata(gap).rawClozeText));
  }
  const proposedEntities = output.proposedEntities.map((entity) => {
    const likeness = assessEntityLikeness({
      preferredLabel: entity.preferredLabel,
      normalizedLabel: entity.normalizedLabel,
    });
    return {
      proposedEntityId: entity.entityId,
      entityType: entity.entityType,
      preferredLabel: entity.preferredLabel,
      normalizedLabel: entity.normalizedLabel,
      confidence: entity.confidence,
      derivation: entity.derivation,
      sourceCardIds: [...entity.sourceCardIds],
      sourceCards: entity.sourceCardIds.map((canonicalCardId) => ({
        canonicalCardId,
        rawClozeAnswer: rawAnswerByCard.get(canonicalCardId) ?? "",
      })),
      numberOfCards: entity.sourceCardIds.length,
      canonicalMatchAttempts: entity.canonicalMatchAttempts,
      claimIds: (claimsByEntity.get(entity.entityId) ?? []).sort(),
      teachesLinksCreated: linksByEntity.get(entity.entityId) ?? 0,
      possibleDuplicateCanonicalEntities: auditCanonicalSimilarity(entity, input.entities),
      entityLike: likeness.entityLike,
      entityLikenessReasons: likeness.reasons,
      contextuallySpecific: entity.contextuallySpecific,
      specificityReasons: [...entity.specificityReasons],
    };
  });
  const assignmentByCard = new Map(output.assignments.map((row) => [row.canonicalCardId, row]));
  const blockedProposals = output.gaps
    .filter((gap) => gap.disposition === "open" && gapMetadata(gap).proposalAssessment !== undefined)
    .map((gap) => {
      const metadata = gapMetadata(gap);
      const assessment = metadata.proposalAssessment as {
        preferredLabel?: unknown;
        normalizedLabel?: unknown;
        entityType?: unknown;
        derivation?: unknown;
        confidence?: unknown;
        entityLike?: unknown;
        entityLikenessReasons?: unknown;
        contextuallySpecific?: unknown;
        specificityReasons?: unknown;
        specificityAnchor?: unknown;
      };
      const reasons = Array.isArray(assessment.entityLikenessReasons)
        ? (assessment.entityLikenessReasons.filter((reason): reason is EntityLikenessReason => typeof reason === "string"))
        : [];
      const specificityReasons = Array.isArray(assessment.specificityReasons)
        ? (assessment.specificityReasons.filter((reason): reason is SpecificityReason => typeof reason === "string"))
        : [];
      const contextuallySpecific = assessment.contextuallySpecific === true
        ? true
        : assessment.contextuallySpecific === false
          ? false
          : ("uncertain" as const);
      return {
        canonicalCardId: gap.canonicalCardId ?? "",
        noteGuid: assignmentByCard.get(gap.canonicalCardId ?? "")?.noteGuid ?? "",
        rawClozeAnswer: stringField(metadata.rawClozeText),
        preferredLabel: stringField(assessment.preferredLabel),
        normalizedLabel: stringField(assessment.normalizedLabel),
        entityType: stringField(assessment.entityType),
        derivation: stringField(assessment.derivation),
        confidence: typeof assessment.confidence === "number" ? assessment.confidence : 0,
        claimId: typeof gap.claimId === "string" ? gap.claimId : null,
        entityLike: assessment.entityLike === true,
        entityLikenessReasons: reasons,
        contextuallySpecific,
        specificityReasons,
        specificityAnchor: typeof assessment.specificityAnchor === "string" && assessment.specificityAnchor
          ? assessment.specificityAnchor
          : null,
        reasonCodes: [...gap.reasonCodes],
      };
    })
    .sort((left, right) => left.canonicalCardId.localeCompare(right.canonicalCardId));
  const unresolvedCards = output.assignments
    .filter((row) => row.queue === "missing_entity")
    .map((row) => {
      const gap = output.gaps.find((item) => item.canonicalCardId === row.canonicalCardId && item.disposition === "open");
      const metadata = gap ? gapMetadata(gap) : {};
      const reason = row.reasonCodes.includes("short_label_insufficient_context")
        ? "short_label_insufficient_context"
        : row.reasonCodes[0] ?? "unresolved_entity";
      return {
        canonicalCardId: row.canonicalCardId,
        noteGuid: row.noteGuid,
        rawClozeAnswer: stringField(metadata.rawClozeText),
        normalizedAnswer: stringField(metadata.normalizedLabel),
        reasonCodes: [...row.reasonCodes],
        unresolvedReason: reason,
      };
    })
    .sort((left, right) => left.canonicalCardId.localeCompare(right.canonicalCardId));
  const shortCount = unresolvedCards.filter((row) => row.unresolvedReason === "short_label_insufficient_context").length;
  return {
    contractVersion: EVALUATION_CONTRACT_VERSION,
    runId: output.factoryRunId,
    mode: input.mode,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    cardsProcessed: output.metrics.cardsProcessed,
    claimsProduced: output.metrics.proposedClaims,
    canonicalEntityMatches: output.metrics.canonicalEntityMatches,
    ontologyGapFilledCards: output.metrics.cardsAttachedToProposedEntities,
    proposedEntitiesCreated: output.metrics.proposedEntitiesCreated,
    proposedEntitiesReused: output.metrics.proposedEntitiesReused,
    cardsAttachedToProposedEntities: output.metrics.cardsAttachedToProposedEntities,
    autoApproved: output.metrics.autoApprovedCards,
    manualReview: output.metrics.exceptionCards,
    unresolved: {
      total: output.metrics.openMissingEntity,
      shortLabelInsufficientContext: shortCount,
      other: output.metrics.openMissingEntity - shortCount,
    },
    proposedEntities,
    blockedProposals,
    unresolvedCards,
  };
}

export type ReviewAction =
  | "approve_new_entity"
  | "merge_with_existing"
  | "add_alias_to_existing"
  | "needs_review"
  | "reject";

export type OntologyReviewItem = {
  proposedEntityId: string;
  entityType: string;
  preferredLabel: string;
  normalizedLabel: string;
  confidence: number;
  derivation: string;
  sourceCards: Array<{ canonicalCardId: string; rawClozeAnswer: string }>;
  claimIds: string[];
  teachesLinksCreated: number;
  canonicalMatchAttempts: CanonicalMatchAttempt[];
  possibleCanonicalDuplicates: CanonicalDuplicateFlag[];
  possibleProposedDuplicates: ProposedDuplicateFlag[];
  recommendedAction: ReviewAction;
  recommendationReasons: string[];
  entityLike: boolean;
  entityLikenessReasons: EntityLikenessReason[];
  contextuallySpecific: true | false | "uncertain";
  specificityReasons: SpecificityReason[];
};

export type BlockedCandidateReviewItem = {
  canonicalCardId: string;
  noteGuid: string;
  rawClozeAnswer: string;
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  derivation: string;
  confidence: number;
  claimId: string | null;
  entityLike: boolean;
  entityLikenessReasons: EntityLikenessReason[];
  contextuallySpecific: true | false | "uncertain";
  specificityReasons: SpecificityReason[];
  specificityAnchor: string | null;
  reasonCodes: string[];
  recommendedAction: "needs_review";
};

export type OntologyReviewPacket = {
  contractVersion: typeof REVIEW_PACKET_CONTRACT_VERSION;
  runId: string;
  mode: EvaluationMode;
  items: OntologyReviewItem[];
  blockedCandidates: BlockedCandidateReviewItem[];
};

function recommendAction(input: {
  canonicalDuplicates: CanonicalDuplicateFlag[];
  proposedDuplicates: ProposedDuplicateFlag[];
  confidence: number;
  derivation: string;
}): { action: ReviewAction; reasons: string[] } {
  const exact = input.canonicalDuplicates.find((flag) =>
    flag.matchReason === "normalized_exact" || flag.matchReason === "alias_exact");
  if (exact) {
    return {
      action: "merge_with_existing",
      reasons: [`exact canonical overlap (${exact.matchReason}) with ${exact.preferredLabel}`],
    };
  }
  const variant = input.canonicalDuplicates[0];
  if (variant) {
    return {
      action: "add_alias_to_existing",
      reasons: [`label variant (${variant.matchReason}) of ${variant.preferredLabel}`],
    };
  }
  if (input.proposedDuplicates.length > 0) {
    return {
      action: "needs_review",
      reasons: [`near-duplicate proposed entities flagged (${input.proposedDuplicates.map((flag) => flag.reason).join(", ")})`],
    };
  }
  if (input.confidence < 0.8 || input.derivation.startsWith("short_acronym")) {
    return {
      action: "needs_review",
      reasons: [`confidence ${input.confidence} via ${input.derivation} needs human review`],
    };
  }
  return { action: "approve_new_entity", reasons: ["high-confidence novel label with no canonical overlap"] };
}

/** Pure transformation: evaluation -> human-reviewable packet. Recommendation only. */
export function buildOntologyReviewPacket(evaluation: CardClaimFactoryEvaluation): OntologyReviewPacket {
  const nearDuplicates = auditProposedNearDuplicates(
    evaluation.proposedEntities.map((entity) => ({
      entityId: entity.proposedEntityId,
      preferredLabel: entity.preferredLabel,
      normalizedLabel: entity.normalizedLabel,
    })),
  );
  const items = evaluation.proposedEntities.map((entity) => {
    const proposedDuplicates = nearDuplicates.get(entity.proposedEntityId) ?? [];
    const recommendation = recommendAction({
      canonicalDuplicates: entity.possibleDuplicateCanonicalEntities,
      proposedDuplicates,
      confidence: entity.confidence,
      derivation: entity.derivation,
    });
    return {
      proposedEntityId: entity.proposedEntityId,
      entityType: entity.entityType,
      preferredLabel: entity.preferredLabel,
      normalizedLabel: entity.normalizedLabel,
      confidence: entity.confidence,
      derivation: entity.derivation,
      sourceCards: entity.sourceCards,
      claimIds: entity.claimIds,
      teachesLinksCreated: entity.teachesLinksCreated,
      canonicalMatchAttempts: entity.canonicalMatchAttempts,
      possibleCanonicalDuplicates: entity.possibleDuplicateCanonicalEntities,
      possibleProposedDuplicates: proposedDuplicates,
      recommendedAction: recommendation.action,
      recommendationReasons: recommendation.reasons,
      entityLike: entity.entityLike,
      entityLikenessReasons: entity.entityLikenessReasons,
      contextuallySpecific: entity.contextuallySpecific,
      specificityReasons: entity.specificityReasons,
    };
  });
  const blockedCandidates = evaluation.blockedProposals.map((blocked) => ({
    canonicalCardId: blocked.canonicalCardId,
    noteGuid: blocked.noteGuid,
    rawClozeAnswer: blocked.rawClozeAnswer,
    preferredLabel: blocked.preferredLabel,
    normalizedLabel: blocked.normalizedLabel,
    entityType: blocked.entityType,
    derivation: blocked.derivation,
    confidence: blocked.confidence,
    claimId: blocked.claimId,
    entityLike: blocked.entityLike,
    entityLikenessReasons: blocked.entityLikenessReasons,
    contextuallySpecific: blocked.contextuallySpecific,
    specificityReasons: blocked.specificityReasons,
    specificityAnchor: blocked.specificityAnchor,
    reasonCodes: blocked.reasonCodes,
    recommendedAction: "needs_review" as const,
  }));
  return {
    contractVersion: REVIEW_PACKET_CONTRACT_VERSION,
    runId: evaluation.runId,
    mode: evaluation.mode,
    items,
    blockedCandidates,
  };
}

export type PromotionAction =
  | "create_canonical_entity"
  | "add_alias"
  | "merge_into_canonical"
  | "reject";

export type ReviewerDecision = {
  action: PromotionAction;
  targetCanonicalEntityId?: string;
  reviewer: string;
  decidedAt: string;
  rationale?: string;
};

export type PromotionPrecondition = {
  key: string;
  met: boolean;
  detail: string;
};

export type PlannedMutation =
  | { kind: "insert_canonical_entity"; entityType: string; preferredLabel: string; normalizedLabel: string; sourceProposedEntityId: string }
  | { kind: "insert_alias"; canonicalEntityId: string; alias: string; sourceProposedEntityId: string }
  | { kind: "retarget_claims"; fromProposedEntityId: string; toCanonicalEntityId: string; claimIds: string[] }
  | { kind: "mark_proposal_decided"; proposedEntityId: string; decision: PromotionAction };

export type OntologyPromotionPlan = {
  contractVersion: typeof PROMOTION_PLAN_CONTRACT_VERSION;
  action: PromotionAction;
  proposedEntityId: string;
  targetCanonicalEntityId?: string;
  mutations: PlannedMutation[];
  preconditions: PromotionPrecondition[];
  provenance: {
    reviewer: string;
    decidedAt: string;
    rationale?: string;
    derivation: string;
    confidence: number;
    sourceCardIds: string[];
    claimIds: string[];
  };
  status: "ready" | "blocked";
  blockers: string[];
};

/**
 * Build a deterministic promotion plan from an explicit reviewer decision.
 * Build != execute: this module contains no executor, so a plan can be
 * inspected but never applied from here. Returns a blocked plan (with zero
 * ready mutations implied) whenever preconditions fail.
 */
export function buildPromotionPlan(
  item: OntologyReviewItem,
  decision: ReviewerDecision,
  canonicalEntities: EntityIndexRow[],
): OntologyPromotionPlan {
  const preconditions: PromotionPrecondition[] = [];
  const check = (key: string, met: boolean, detail: string): void => {
    preconditions.push({ key, met, detail });
  };
  check("reviewer_decision_present", decision.reviewer.trim().length > 0, "an explicit reviewer identity is required");
  check("proposed_entity_exists", item.proposedEntityId.length > 0, "the proposed entity must exist");
  check("stable_label", item.preferredLabel.trim().length > 0 && item.normalizedLabel.trim().length > 0, "the proposed label must be stable and non-empty");
  check("valid_entity_type", item.entityType.trim().length > 0, "a valid entity type is required");
  check("has_source_card", item.sourceCards.length > 0, "at least one source card is required");
  check("has_claim", item.claimIds.length > 0, "at least one claim is required");

  const byId = new Map(canonicalEntities.map((entity) => [entity.id, entity]));
  const target = decision.targetCanonicalEntityId ? byId.get(decision.targetCanonicalEntityId) ?? null : null;
  const mutations: PlannedMutation[] = [];

  if (decision.action === "create_canonical_entity") {
    const collision = activeCanonicalEntities(canonicalEntities).some((entity) =>
      normalizeClinicalText(entity.normalizedLabel) === normalizeClinicalText(item.normalizedLabel)
      || [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases]
        .map(normalizeClinicalText)
        .includes(normalizeClinicalText(item.normalizedLabel)));
    check("no_exact_canonical_collision", !collision, collision ? "a canonical entity already carries this label" : "no exact canonical collision");
    if (!collision) {
      mutations.push({
        kind: "insert_canonical_entity",
        entityType: item.entityType,
        preferredLabel: item.preferredLabel,
        normalizedLabel: item.normalizedLabel,
        sourceProposedEntityId: item.proposedEntityId,
      });
      mutations.push({ kind: "retarget_claims", fromProposedEntityId: item.proposedEntityId, toCanonicalEntityId: "<new-canonical-id>", claimIds: [...item.claimIds] });
      mutations.push({ kind: "mark_proposal_decided", proposedEntityId: item.proposedEntityId, decision: decision.action });
    }
  } else if (decision.action === "add_alias" || decision.action === "merge_into_canonical") {
    check("target_canonical_exists", target !== null, target ? "target canonical entity exists" : "target canonical entity is missing");
    const alias = item.preferredLabel.trim();
    check("alias_non_empty", alias.length > 0, "the alias must be non-empty");
    const owner = activeCanonicalEntities(canonicalEntities).find((entity) =>
      [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases]
        .map(normalizeClinicalText)
        .includes(normalizeClinicalText(alias)));
    const collisionElsewhere = owner && (!target || owner.id !== target.id);
    check(
      "alias_not_owned_elsewhere",
      !collisionElsewhere,
      collisionElsewhere
        ? `alias belongs unambiguously to ${owner!.preferredLabel}`
        : "alias is not owned by another canonical entity",
    );
    const typeCompatible = !target || target.entityType === item.entityType;
    if (decision.action === "merge_into_canonical") {
      check("entity_types_compatible", typeCompatible, typeCompatible ? "entity types match" : `type mismatch: proposed ${item.entityType} vs canonical ${target?.entityType}`);
    }
    if (target && !collisionElsewhere && (decision.action === "add_alias" || typeCompatible)) {
      if (decision.action === "add_alias") {
        mutations.push({ kind: "insert_alias", canonicalEntityId: target.id, alias, sourceProposedEntityId: item.proposedEntityId });
      } else {
        mutations.push({ kind: "retarget_claims", fromProposedEntityId: item.proposedEntityId, toCanonicalEntityId: target.id, claimIds: [...item.claimIds] });
      }
      mutations.push({ kind: "mark_proposal_decided", proposedEntityId: item.proposedEntityId, decision: decision.action });
    }
  } else {
    check("reject_needs_no_target", true, "reject performs no mutation; the proposal remains noncanonical");
  }

  const blockers = preconditions.filter((precondition) => !precondition.met).map((precondition) => precondition.key);
  return {
    contractVersion: PROMOTION_PLAN_CONTRACT_VERSION,
    action: decision.action,
    proposedEntityId: item.proposedEntityId,
    ...(decision.targetCanonicalEntityId ? { targetCanonicalEntityId: decision.targetCanonicalEntityId } : {}),
    mutations: blockers.length > 0 ? [] : mutations,
    preconditions,
    provenance: {
      reviewer: decision.reviewer,
      decidedAt: decision.decidedAt,
      ...(decision.rationale ? { rationale: decision.rationale } : {}),
      derivation: item.derivation,
      confidence: item.confidence,
      sourceCardIds: item.sourceCards.map((card) => card.canonicalCardId),
      claimIds: [...item.claimIds],
    },
    status: blockers.length > 0 ? "blocked" : "ready",
    blockers,
  };
}

export type FactorySnapshotCard = {
  canonicalCardId: string;
  queue: string;
  reasonCodes: string[];
  entityTarget: string;
  claimId: string | null;
  proposedEntityId: string | null;
  teachesLinkAutoApproved: boolean;
};

export type FactorySnapshot = {
  contractVersion: typeof EVALUATION_CONTRACT_VERSION;
  runId: string;
  mode: EvaluationMode;
  cardsProcessed: number;
  claimsProduced: number;
  canonicalEntityMatches: number;
  ontologyGapFilledCards: number;
  proposedEntitiesCreated: number;
  proposedEntitiesReused: number;
  cardsAttachedToProposedEntities: number;
  autoApproved: number;
  manualReview: number;
  unresolvedTotal: number;
  unresolvedShortContext: number;
  unresolvedOther: number;
  cards: FactorySnapshotCard[];
  proposedEntities: Array<{
    proposedEntityId: string;
    preferredLabel: string;
    normalizedLabel: string;
    entityType: string;
    confidence: number;
    derivation: string;
    sourceCardIds: string[];
    reused: boolean;
    claimIds: string[];
  }>;
};

/**
 * Deterministic snapshot for regression diffing. Contains no timestamps or
 * other nondeterministic fields: the same input must yield byte-identical
 * output across runs.
 */
export function normalizeSnapshot(
  output: CardClaimFactoryOutput,
  mode: EvaluationMode,
): FactorySnapshot {
  const linkByCard = new Map(output.autoApprovedLinks.map((link) => [link.canonicalCardId, link]));
  const cards = output.assignments.map((assignment) => {
    const claim = assignment.fingerprintHash
      ? output.proposedClaims.find((item) => item.fingerprintHash === assignment.fingerprintHash) ?? null
      : null;
    const link = linkByCard.get(assignment.canonicalCardId) ?? null;
    const proposedEntityId = claim && claim.primaryEntityId !== "00000000-0000-4000-8000-000000000001"
      && output.proposedEntities.some((entity) => entity.entityId === claim.primaryEntityId)
      ? claim.primaryEntityId
      : null;
    return {
      canonicalCardId: assignment.canonicalCardId,
      queue: assignment.queue,
      reasonCodes: [...assignment.reasonCodes],
      entityTarget: claim?.entityTargetType ?? "unresolved",
      claimId: claim?.claimId ?? null,
      proposedEntityId,
      teachesLinkAutoApproved: link?.reviewStatus === "auto_approved",
    };
  }).sort((left, right) => left.canonicalCardId.localeCompare(right.canonicalCardId));
  return {
    contractVersion: EVALUATION_CONTRACT_VERSION,
    runId: output.factoryRunId,
    mode,
    cardsProcessed: output.metrics.cardsProcessed,
    claimsProduced: output.metrics.proposedClaims,
    canonicalEntityMatches: output.metrics.canonicalEntityMatches,
    ontologyGapFilledCards: output.metrics.cardsAttachedToProposedEntities,
    proposedEntitiesCreated: output.metrics.proposedEntitiesCreated,
    proposedEntitiesReused: output.metrics.proposedEntitiesReused,
    cardsAttachedToProposedEntities: output.metrics.cardsAttachedToProposedEntities,
    autoApproved: output.metrics.autoApprovedCards,
    manualReview: output.metrics.exceptionCards,
    unresolvedTotal: output.metrics.openMissingEntity,
    unresolvedShortContext: output.metrics.shortLabelInsufficientContext,
    unresolvedOther: output.metrics.openMissingEntity - output.metrics.shortLabelInsufficientContext,
    cards,
    proposedEntities: output.proposedEntities.map((entity) => ({
      proposedEntityId: entity.entityId,
      preferredLabel: entity.preferredLabel,
      normalizedLabel: entity.normalizedLabel,
      entityType: entity.entityType,
      confidence: entity.confidence,
      derivation: entity.derivation,
      sourceCardIds: [...entity.sourceCardIds],
      reused: entity.sourceCardIds.length > 1,
      claimIds: output.proposedClaims
        .filter((claim) => claim.primaryEntityId === entity.entityId)
        .map((claim) => claim.claimId)
        .sort(),
    })),
  };
}
