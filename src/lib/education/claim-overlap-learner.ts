import { matchClaimOverlap, type ClaimOverlapInventory } from "./claim-overlap-matcher";
import {
  CLAIM_OVERLAP_LAUNCH_REASON,
  CLAIM_OVERLAP_LEARNER_ALGORITHM,
  CLAIM_OVERLAP_LEARNER_CONTRACT,
  type ClaimOverlapLearnerCard,
  type ClaimOverlapLearnerSnapshot,
} from "./contracts/claim-overlap-learner-v1";
import type { ClaimOverlapQuery } from "./contracts/claim-overlap-v1";
import type { ClinicalClaimGapClass } from "./contracts/clinical-claim-v1";
import {
  isQuestionSourceIdentityV1,
  type QuestionSourceIdentityV1,
} from "./contracts/question-source-identity-v1";

export type ClaimOverlapMiss = {
  identity: QuestionSourceIdentityV1;
  /** SnapOrtho-authored tested claim. Null when the question has not resolved to one. */
  testedClaim: ClaimOverlapQuery | null;
};

function snapshot(input: {
  status: ClaimOverlapLearnerSnapshot["status"];
  disposition: ClaimOverlapLearnerSnapshot["disposition"];
  gapClass: ClinicalClaimGapClass | null;
  reasonCodes: string[];
  claimId?: string | null;
  claimVersionId?: string | null;
  primaryEntityId?: string | null;
  cards?: ClaimOverlapLearnerSnapshot["cards"];
  launchCommands?: ClaimOverlapLearnerSnapshot["launchCommands"];
}): ClaimOverlapLearnerSnapshot {
  return {
    contractVersion: CLAIM_OVERLAP_LEARNER_CONTRACT,
    algorithm: CLAIM_OVERLAP_LEARNER_ALGORITHM,
    status: input.status,
    disposition: input.disposition,
    gapClass: input.gapClass,
    reasonCodes: input.reasonCodes,
    claimId: input.claimId ?? null,
    claimVersionId: input.claimVersionId ?? null,
    primaryEntityId: input.primaryEntityId ?? null,
    cards: input.cards ?? [],
    launchCommands: input.launchCommands ?? [],
  };
}

function abstain(reasonCodes: string[], gapClass: ClinicalClaimGapClass | null, claim?: {
  claimId: string | null;
  claimVersionId: string | null;
  primaryEntityId: string | null;
}): ClaimOverlapLearnerSnapshot {
  return snapshot({
    status: "abstain",
    disposition: "abstain",
    gapClass,
    reasonCodes,
    claimId: claim?.claimId,
    claimVersionId: claim?.claimVersionId,
    primaryEntityId: claim?.primaryEntityId,
  });
}

/**
 * Turn one reviewed miss into a recommendation snapshot.
 * Cards are selected only after the claim matches. An empty snapshot is a result.
 * Launch commands carry the Anki note GUID and card ordinal and nothing else.
 */
export function recommendClaimOverlapMiss(
  miss: ClaimOverlapMiss,
  inventory: ClaimOverlapInventory,
): ClaimOverlapLearnerSnapshot {
  const identity = miss.identity;
  if (!isQuestionSourceIdentityV1(identity)) {
    return abstain(["identity_packet_rejected"], "source_extraction_gap");
  }
  if (identity.reviewState !== "answered_review" || identity.correct !== false) {
    return snapshot({
      status: "not_a_miss",
      disposition: "not_a_miss",
      gapClass: null,
      reasonCodes: ["review_outcome_is_not_a_miss"],
    });
  }
  if (identity.identityStatus !== "stable" || !identity.nativeQuestionId) {
    return abstain(["identity_not_stable"], "source_extraction_gap");
  }

  const tested = miss.testedClaim;
  if (!tested) return abstain(["tested_claim_missing"], "missing_claim");
  if (tested.provider !== identity.provider || tested.nativeQuestionId !== identity.nativeQuestionId) {
    return abstain(["identity_claim_mismatch"], null);
  }
  if (tested.sourceFingerprintHash !== identity.sourceFingerprintHash) {
    return abstain(["source_fingerprint_drift"], null, { claimId: null, claimVersionId: null, primaryEntityId: tested.primaryEntityId });
  }

  const match = matchClaimOverlap(tested, inventory);
  const claim = {
    claimId: match.claimId,
    claimVersionId: match.claimVersionId,
    primaryEntityId: tested.primaryEntityId,
  };
  if (match.disposition === "abstain") {
    const gapClass: ClinicalClaimGapClass | null = match.reasonCodes.includes("no_claim_match")
      ? "missing_claim"
      : null;
    return abstain(match.reasonCodes, gapClass, claim);
  }
  if (match.disposition === "no_card" || match.cards.length === 0) {
    return snapshot({
      status: "no_card",
      disposition: "no_card",
      gapClass: "missing_card",
      reasonCodes: match.reasonCodes,
      ...claim,
    });
  }

  const cards = match.cards.map((card) => ({
    canonicalCardId: card.canonicalCardId,
    canonicalCardVersionId: card.canonicalCardVersionId,
    noteGuid: card.noteGuid,
    cardOrdinal: card.cardOrdinal,
    rank: card.rank,
    reasonCode: CLAIM_OVERLAP_LAUNCH_REASON,
  }));
  return snapshot({
    status: "completed",
    disposition: "served",
    gapClass: null,
    reasonCodes: match.reasonCodes,
    ...claim,
    cards,
    launchCommands: cards.map((card) => ({
      canonicalCardId: card.canonicalCardId,
      canonicalCardVersionId: card.canonicalCardVersionId,
      noteGuid: card.noteGuid,
      cardOrdinal: card.cardOrdinal,
      rank: card.rank,
    })),
  });
}

export type LearnerFeedbackSignal = "helpful" | "not_helpful" | "dismissed";

/** Feedback is stored beside the snapshot. It does not add, remove, or rerank cards. */
export function recordLearnerFeedback(
  snapshot: ClaimOverlapLearnerSnapshot,
  signal: LearnerFeedbackSignal,
): { signal: LearnerFeedbackSignal; cards: ClaimOverlapLearnerCard[]; affectsMatch: false } {
  return {
    signal,
    cards: snapshot.cards.map((card) => ({ ...card })),
    affectsMatch: false,
  };
}
