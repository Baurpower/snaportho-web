import {
  clinicalClaimFingerprintHash,
  containsProtectedEducationalContent,
  isCardClaimLinkV1,
  isClinicalClaimRecordV1,
  type CardClaimLinkV1,
  type ClinicalClaimQualifiers,
  type ClinicalClaimRecordV1,
  type ClinicalClaimType,
  type EducationalClaimGapV1,
} from "./contracts/clinical-claim-v1";
import { checksum } from "./deck-mapping-factory";
import { containsUnsafeMetadata, deterministicUuid } from "./deck-foundation";
import {
  assertDurableSemanticSafe,
  canonicalContentHash,
  crossCardFindings,
  runSemanticCard,
  stripNonClinicalMarkup,
  validateEphemeralCard,
  type EntityIndexRow,
  type EphemeralCard,
  type SemanticCardResult,
  type SemanticCritic,
} from "./deck-semantic-mapping";

export const CARD_CLAIM_FACTORY_CONTRACT_VERSION = "snaportho-card-claim-factory.v1" as const;
export const CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION = "2026-09-19.1" as const;
export const CARD_CLAIM_FACTORY_ALGORITHM = "card-claim-factory.v1" as const;

export const CARD_CLAIM_FACTORY_QUEUES = [
  "auto_approved",
  "non_atomic",
  "competing_entities",
  "negated_or_distractor",
  "missing_entity",
  "qualifier_conflict",
  "duplicate_sibling",
  "extraction_failed",
  "inactive_or_stale",
  "cross_card_contradiction",
  "insufficient_content",
] as const;

export type CardClaimFactoryQueue = (typeof CARD_CLAIM_FACTORY_QUEUES)[number];

export type CardClaimFactoryCard = EphemeralCard & {
  noteGuid: string;
  active: boolean;
  currentVersion: boolean;
  inclusionStatus?: "included" | "excluded" | "withdrawn";
};

export type ExistingClaimRef = {
  claimId: string;
  currentVersionId: string;
  fingerprintHash: string;
};

export type ExtractedCloze = {
  clozeNumber: number;
  answer: string;
  filledText: string;
  clozeNumbers: number[];
};

export type ProposedFactoryClaim = ClinicalClaimRecordV1 & {
  evidenceLocator: "cloze" | "extra";
  evidenceHash: string;
};

export type CardClaimFactoryAssignment = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  contentHash: string;
  queue: CardClaimFactoryQueue;
  reasonCodes: string[];
  fingerprintHash: string | null;
};

export type CardClaimFactoryOutput = {
  contractVersion: typeof CARD_CLAIM_FACTORY_CONTRACT_VERSION;
  algorithmVersion: typeof CARD_CLAIM_FACTORY_ALGORITHM;
  factoryRunId: string;
  dryRun: true;
  proposedClaims: ProposedFactoryClaim[];
  autoApprovedLinks: CardClaimLinkV1[];
  assignments: CardClaimFactoryAssignment[];
  exceptionQueue: CardClaimFactoryAssignment[];
  gaps: EducationalClaimGapV1[];
  machineReviews: Array<{
    canonicalCardId: string;
    reviewerType: string;
    decision: SemanticCritic["decision"];
    reasonCodes: string[];
  }>;
  metrics: {
    cardsProcessed: number;
    autoApprovedCards: number;
    autoApprovedLinks: number;
    proposedClaims: number;
    exceptionCards: number;
    mergedClaimCount: number;
  };
};

const CLOZE_RE = /\{\{c(\d+)::([^{}]*?)(?:::[^{}]*?)?\}\}/gi;
const TEXT_FIELDS = new Set(["text", "front"]);

function teachingField(card: EphemeralCard): { name: string; rawValue: string; plainText: string } | null {
  const preferred = card.fields.find((field) => TEXT_FIELDS.has(field.name.toLowerCase()))
    ?? card.fields.find((field) => field.rawValue.includes("{{c"))
    ?? card.fields[0];
  if (!preferred) return null;
  return {
    name: preferred.name,
    rawValue: preferred.rawValue,
    plainText: preferred.plainText ?? preferred.rawValue,
  };
}

export function extractTargetCloze(raw: string, cardOrdinal: number): ExtractedCloze | null {
  const clozeNumber = cardOrdinal + 1;
  const numbers = new Set<number>();
  let targetAnswer: string | null = null;
  const filledText = raw.replace(CLOZE_RE, (_match, rawNumber: string, answer: string) => {
    const number = Number(rawNumber);
    numbers.add(number);
    if (number === clozeNumber && targetAnswer == null) targetAnswer = answer;
    return answer;
  });
  if (targetAnswer == null || numbers.size === 0) return null;
  return {
    clozeNumber,
    answer: targetAnswer,
    filledText,
    clozeNumbers: [...numbers].sort((left, right) => left - right),
  };
}

export function extractQualifiers(text: string): { qualifiers: ClinicalClaimQualifiers; conflicts: string[] } {
  const normalized = stripNonClinicalMarkup(text).toLowerCase();
  const qualifiers: ClinicalClaimQualifiers = {};
  const conflicts: string[] = [];
  const hasLeft = /\bleft\b/.test(normalized);
  const hasRight = /\bright\b/.test(normalized);
  const hasBilateral = /\bbilateral\b/.test(normalized);
  if (hasLeft && hasRight && !hasBilateral) conflicts.push("laterality_conflict");
  else if (hasBilateral) qualifiers.laterality = "bilateral";
  else if (hasLeft) qualifiers.laterality = "left";
  else if (hasRight) qualifiers.laterality = "right";
  if (/\b(pediatric|child|children)\b/.test(normalized)) qualifiers.age_group = "pediatric";
  else if (/\badult\b/.test(normalized)) qualifiers.age_group = "adult";
  if (/\brevision\b/.test(normalized)) qualifiers.setting = "revision";
  else if (/\bpostoperative\b|\bpost-op\b/.test(normalized)) qualifiers.setting = "postoperative";
  else if (/\bprimary\b/.test(normalized)) qualifiers.setting = "primary";
  return { qualifiers, conflicts };
}

export function inferClaimType(input: {
  filledText: string;
  entityType: string | null;
}): { claimType: ClinicalClaimType; predicate: string } {
  const text = stripNonClinicalMarkup(input.filledText).toLowerCase();
  if (/\bcontraindicat|\bnot indicated\b|\bavoid\b/.test(text)) {
    return { claimType: "contraindication", predicate: "contraindication" };
  }
  if (/\bcomplicat|\bat risk\b|\brisk of\b/.test(text)) {
    return { claimType: "complication", predicate: "complication_of" };
  }
  if (/\bpreferred\b|\btreatment of choice\b|\bindicated\b/.test(text)) {
    return {
      claimType: "treatment_indication",
      predicate: /\bpreferred\b|\btreatment of choice\b/.test(text) ? "preferred_treatment" : "indication",
    };
  }
  if (input.entityType === "complication") return { claimType: "complication", predicate: "complication_of" };
  if (input.entityType === "anatomy_structure") return { claimType: "anatomy_pearl", predicate: "teaches_fact" };
  if (input.entityType === "imaging_finding" || input.entityType === "diagnostic_test") {
    return { claimType: "imaging_point", predicate: "imaging_finding" };
  }
  if (
    input.entityType === "procedure"
    || input.entityType === "fixation_method"
    || input.entityType === "treatment_principle"
  ) {
    return { claimType: "treatment_indication", predicate: "indication" };
  }
  return { claimType: "fact", predicate: "teaches_fact" };
}

function compactText(value: string, max: number): string {
  const cleaned = stripNonClinicalMarkup(value).replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trim();
}

function primaryCriticsSupport(result: SemanticCardResult, primaryEntityId: string): {
  supported: boolean;
  reasonCodes: string[];
  reviews: SemanticCritic[];
} {
  const reviews = result.critics.filter(
    (critic) => critic.canonicalEntityId === primaryEntityId || critic.canonicalEntityId == null,
  );
  const opposed = reviews.filter((critic) => critic.decision !== "support");
  return {
    supported: reviews.length > 0 && opposed.length === 0,
    reasonCodes: opposed.flatMap((critic) => critic.reasonCodes),
    reviews,
  };
}

function cardEligible(card: CardClaimFactoryCard): string | null {
  if (!card.active || !card.currentVersion) return "inactive_or_stale";
  if (card.inclusionStatus === "excluded" || card.inclusionStatus === "withdrawn") return "inactive_or_stale";
  return null;
}

export function autoApprovePolicy(input: {
  criticsSupport: boolean;
  uniqueEntity: boolean;
  atomic: boolean;
  currentAndActive: boolean;
  contradiction: boolean;
  duplicateSibling: boolean;
  qualifierConflict: boolean;
  extracted: boolean;
}): { approved: boolean; queue: CardClaimFactoryQueue; reasonCodes: string[] } {
  if (!input.currentAndActive) return { approved: false, queue: "inactive_or_stale", reasonCodes: ["inactive_or_stale"] };
  if (!input.extracted) return { approved: false, queue: "extraction_failed", reasonCodes: ["cloze_not_extracted"] };
  if (input.qualifierConflict) return { approved: false, queue: "qualifier_conflict", reasonCodes: ["qualifier_conflict"] };
  if (!input.uniqueEntity) return { approved: false, queue: "competing_entities", reasonCodes: ["unique_entity_required"] };
  if (!input.atomic) return { approved: false, queue: "non_atomic", reasonCodes: ["non_atomic_card"] };
  if (!input.criticsSupport) return { approved: false, queue: "insufficient_content", reasonCodes: ["critic_not_unanimous"] };
  if (input.contradiction) return { approved: false, queue: "cross_card_contradiction", reasonCodes: ["cross_card_contradiction"] };
  if (input.duplicateSibling) return { approved: false, queue: "duplicate_sibling", reasonCodes: ["duplicate_sibling_cloze"] };
  return { approved: true, queue: "auto_approved", reasonCodes: ["machine_consensus"] };
}

export function runCardClaimFactory(input: {
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
  existingClaims?: ExistingClaimRef[];
}): CardClaimFactoryOutput {
  if (containsUnsafeMetadata(input.cards.map((card) => card.tags))) {
    throw new Error("unsafe_input_metadata");
  }
  const cards = [...input.cards].sort((left, right) => (
    left.noteGuid.localeCompare(right.noteGuid)
    || left.cardOrdinal - right.cardOrdinal
    || left.canonicalCardId.localeCompare(right.canonicalCardId)
  ));
  for (const card of cards) {
    validateEphemeralCard(card, {
      cardId: card.canonicalCardId,
      versionId: card.canonicalCardVersionId,
      contentHash: card.contentHash,
    });
    if (canonicalContentHash(card) !== card.contentHash) throw new Error(`content_hash_mismatch:${card.canonicalCardId}`);
  }

  const semanticByCard = new Map(cards.map((card) => [card.canonicalCardId, runSemanticCard(card, input.entities)]));
  const conflicts = new Set(
    crossCardFindings([...semanticByCard.values()])
      .flatMap((finding) => (finding.cardVersionIds as string[] | undefined) ?? []),
  );
  const existingByHash = new Map((input.existingClaims ?? []).map((claim) => [claim.fingerprintHash, claim]));
  const claimByHash = new Map<string, ProposedFactoryClaim>();
  const links: CardClaimLinkV1[] = [];
  const assignments: CardClaimFactoryAssignment[] = [];
  const gaps: EducationalClaimGapV1[] = [];
  const machineReviews: CardClaimFactoryOutput["machineReviews"] = [];
  const approvedFingerprintsByNote = new Map<string, Set<string>>();

  for (const card of cards) {
    const eligibility = cardEligible(card);
    const semantic = semanticByCard.get(card.canonicalCardId)!;
    const field = teachingField(card);
    const cloze = field ? extractTargetCloze(field.rawValue, card.cardOrdinal) : null;
    const filled = cloze?.filledText ?? field?.plainText ?? "";
    const objectText = compactText(cloze?.answer ?? "", 200);
    const claimText = compactText(filled, 500);
    const qualifierInfo = extractQualifiers(filled);
    const centrals = semantic.concepts.filter((concept) => concept.central);
    const selectedCentrals = semantic.resolutions.filter((resolution) => (
      resolution.disposition === "selected"
      && resolution.canonicalEntityId
      && centrals.some((concept) => concept.conceptId === resolution.conceptId)
    ));
    const missingEntity = semantic.resolutions.some((resolution) => resolution.disposition === "missing_entity");
    const competing = semantic.resolutions.some((resolution) => (
      resolution.disposition === "deferred" && resolution.reasonCodes.includes("alias_ambiguity")
    ));
    const negated = semantic.concepts.some((concept) => concept.negated || concept.distractor);
    const primary = selectedCentrals[0] ?? null;
    const criticGate = primary
      ? primaryCriticsSupport(semantic, primary.canonicalEntityId!)
      : { supported: false, reasonCodes: ["no_primary_entity"], reviews: semantic.critics };
    machineReviews.push(...criticGate.reviews.map((review) => ({
      canonicalCardId: card.canonicalCardId,
      reviewerType: review.reviewerType,
      decision: review.decision,
      reasonCodes: review.reasonCodes,
    })));

    let queue: CardClaimFactoryQueue = "extraction_failed";
    let reasonCodes: string[] = [];
    if (eligibility) {
      queue = "inactive_or_stale";
      reasonCodes = [eligibility];
    } else if (!cloze || !objectText || !claimText) {
      queue = "extraction_failed";
      reasonCodes = ["cloze_not_extracted"];
    } else if (qualifierInfo.conflicts.length) {
      queue = "qualifier_conflict";
      reasonCodes = qualifierInfo.conflicts;
    } else if (negated) {
      queue = "negated_or_distractor";
      reasonCodes = ["negated_or_distractor"];
    } else if (competing) {
      queue = "competing_entities";
      reasonCodes = ["alias_ambiguity"];
    } else if (missingEntity && !primary) {
      queue = "missing_entity";
      reasonCodes = ["missing_entity"];
    } else if (semantic.qualityFindings.includes("potential_multiconcept_overload") || centrals.length > 2) {
      queue = "non_atomic";
      reasonCodes = semantic.qualityFindings.length ? semantic.qualityFindings : ["non_atomic_card"];
    } else if (conflicts.has(card.canonicalCardVersionId)) {
      queue = "cross_card_contradiction";
      reasonCodes = ["cross_card_contradiction"];
    } else if (!primary || selectedCentrals.length !== 1) {
      queue = selectedCentrals.length > 1 ? "competing_entities" : (semantic.qualityFindings.includes("insufficient_clinical_content") ? "insufficient_content" : "missing_entity");
      reasonCodes = selectedCentrals.length > 1 ? ["multiple_central_entities"] : criticGate.reasonCodes;
    } else {
      const inferred = inferClaimType({ filledText: filled, entityType: primary.entityType });
      const fingerprintInput = {
        claimType: inferred.claimType,
        primaryEntityId: primary.canonicalEntityId!,
        predicate: inferred.predicate,
        objectText,
        qualifiers: qualifierInfo.qualifiers,
      };
      const fingerprintHash = clinicalClaimFingerprintHash(fingerprintInput);
      const siblingKeys = approvedFingerprintsByNote.get(card.noteGuid) ?? new Set<string>();
      const policy = autoApprovePolicy({
        criticsSupport: criticGate.supported,
        uniqueEntity: true,
        atomic: centrals.length <= 2 && !semantic.qualityFindings.includes("potential_multiconcept_overload"),
        currentAndActive: true,
        contradiction: false,
        duplicateSibling: siblingKeys.has(fingerprintHash),
        qualifierConflict: false,
        extracted: true,
      });
      queue = policy.queue;
      reasonCodes = policy.reasonCodes;
      if (policy.approved) {
        const existing = existingByHash.get(fingerprintHash) ?? claimByHash.get(fingerprintHash);
        const claimId = existing?.claimId ?? deterministicUuid(`clinical-claim|${fingerprintHash}`);
        const currentVersionId = existing?.currentVersionId
          ?? deterministicUuid(`clinical-claim-version|${fingerprintHash}|${CARD_CLAIM_FACTORY_ALGORITHM}`);
        const evidenceHash = checksum({
          cardVersionId: card.canonicalCardVersionId,
          fingerprintHash,
          locator: "cloze",
        });
        const proposed: ProposedFactoryClaim = {
          contractVersion: "snaportho-clinical-claim.v1",
          claimId,
          currentVersionId,
          fingerprintHash,
          claimText,
          claimType: inferred.claimType,
          predicate: inferred.predicate,
          objectText,
          qualifiers: qualifierInfo.qualifiers,
          primaryEntityId: primary.canonicalEntityId!,
          approvalMethod: "machine_consensus",
          algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
          isActive: true,
          evidenceLocator: "cloze",
          evidenceHash,
        };
        if (!isClinicalClaimRecordV1(proposed)) throw new Error(`unsafe_or_invalid_claim:${card.canonicalCardId}`);
        claimByHash.set(fingerprintHash, proposed);
        const link: CardClaimLinkV1 = {
          contractVersion: "snaportho-clinical-claim.v1",
          canonicalCardId: card.canonicalCardId,
          canonicalCardVersionId: card.canonicalCardVersionId,
          claimId,
          claimVersionId: currentVersionId!,
          mappingRole: "teaches",
          confidence: Math.min(
            0.99,
            Math.max(0.9, criticGate.reviews.reduce((sum, review) => sum + review.confidence, 0) / Math.max(criticGate.reviews.length, 1)),
          ),
          approvalMethod: "machine_consensus",
          reviewStatus: "auto_approved",
          algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
          evidenceLocator: "cloze",
          evidenceHashes: [evidenceHash],
          reasonCodes: ["machine_consensus", "unique_entity", "atomic_card"],
          metadata: { factoryImplementation: CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION },
          isActive: true,
        };
        if (!isCardClaimLinkV1(link) || containsProtectedEducationalContent(link)) {
          throw new Error(`unsafe_or_invalid_link:${card.canonicalCardId}`);
        }
        links.push(link);
        siblingKeys.add(fingerprintHash);
        approvedFingerprintsByNote.set(card.noteGuid, siblingKeys);
      } else if (!criticGate.supported) {
        reasonCodes = criticGate.reasonCodes.length ? criticGate.reasonCodes : policy.reasonCodes;
      }
    }

    if (queue === "missing_entity") {
      gaps.push({
        contractVersion: "snaportho-clinical-claim.v1",
        gapClass: "missing_claim",
        owner: "kg",
        disposition: "open",
        priorityScore: 70,
        claimId: null,
        claimVersionId: null,
        canonicalCardId: card.canonicalCardId,
        provider: null,
        nativeQuestionId: null,
        algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
        reasonCodes,
        metadata: { canonicalCardVersionId: card.canonicalCardVersionId },
        isActive: true,
      });
    }

    assignments.push({
      canonicalCardId: card.canonicalCardId,
      canonicalCardVersionId: card.canonicalCardVersionId,
      noteGuid: card.noteGuid,
      cardOrdinal: card.cardOrdinal,
      contentHash: card.contentHash,
      queue,
      reasonCodes,
      fingerprintHash: null,
    });
  }

  for (const assignment of assignments) {
    if (assignment.queue !== "auto_approved") continue;
    const link = links.find((row) => row.canonicalCardId === assignment.canonicalCardId);
    assignment.fingerprintHash = link
      ? [...claimByHash.values()].find((claim) => claim.claimId === link.claimId)?.fingerprintHash ?? null
      : null;
  }

  const proposedClaims = [...claimByHash.values()].sort((left, right) => left.claimId.localeCompare(right.claimId));
  const autoApprovedLinks = [...links].sort((left, right) => left.canonicalCardId.localeCompare(right.canonicalCardId));
  const output: CardClaimFactoryOutput = {
    contractVersion: CARD_CLAIM_FACTORY_CONTRACT_VERSION,
    algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
    factoryRunId: deterministicUuid(`card-claim-factory|${checksum(cards.map((card) => [card.canonicalCardVersionId, card.contentHash]))}|${CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION}`),
    dryRun: true,
    proposedClaims,
    autoApprovedLinks,
    assignments,
    exceptionQueue: assignments.filter((row) => row.queue !== "auto_approved"),
    gaps,
    machineReviews,
    metrics: {
      cardsProcessed: cards.length,
      autoApprovedCards: assignments.filter((row) => row.queue === "auto_approved").length,
      autoApprovedLinks: autoApprovedLinks.length,
      proposedClaims: proposedClaims.length,
      exceptionCards: assignments.filter((row) => row.queue !== "auto_approved").length,
      mergedClaimCount: autoApprovedLinks.length - proposedClaims.length,
    },
  };
  assertDurableSemanticSafe({
    proposedClaims: output.proposedClaims.map((claim) => ({
      claimId: claim.claimId,
      fingerprintHash: claim.fingerprintHash,
      claimText: claim.claimText,
      claimType: claim.claimType,
      predicate: claim.predicate,
      objectText: claim.objectText,
      qualifiers: claim.qualifiers,
    })),
    autoApprovedLinks: output.autoApprovedLinks.map((link) => ({
      canonicalCardId: link.canonicalCardId,
      claimId: link.claimId,
      reviewStatus: link.reviewStatus,
      evidenceLocator: link.evidenceLocator,
      reasonCodes: link.reasonCodes,
    })),
    exceptionQueue: output.exceptionQueue,
    gaps: output.gaps,
    metrics: output.metrics,
  });
  if (assignments.length !== cards.length) throw new Error("incomplete_terminal_card_accounting");
  return output;
}
