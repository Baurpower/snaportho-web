import {
  CLINICAL_CLAIM_GAP_CLASSES,
  containsProtectedEducationalContent,
  type ClinicalClaimGapClass,
} from "./clinical-claim-v1";
import { CLAIM_OVERLAP_ALGORITHM, CLAIM_OVERLAP_MAX_CARDS } from "./claim-overlap-v1";
import { QUESTION_SOURCE_PROVIDERS, type QuestionSourceProvider } from "./question-source-identity-v1";

export const CLAIM_OVERLAP_LEARNER_CONTRACT = "claim-overlap.v1" as const;
export const CLAIM_OVERLAP_LEARNER_ALGORITHM = CLAIM_OVERLAP_ALGORITHM;
export const CLAIM_OVERLAP_LAUNCH_REASON = "exact_claim_overlap" as const;

export const CLAIM_OVERLAP_LEARNER_STATUSES = ["completed", "abstain", "no_card", "not_a_miss"] as const;
export const CLAIM_OVERLAP_LEARNER_DISPOSITIONS = ["served", "abstain", "no_card", "not_a_miss"] as const;
export const CLAIM_OVERLAP_RUN_STATUSES = ["completed", "abstain", "no_card"] as const;
export const CLAIM_OVERLAP_LAUNCH_STATUSES = ["opened", "not_found", "ambiguous", "unsupported", "failed"] as const;

export type ClaimOverlapLearnerStatus = (typeof CLAIM_OVERLAP_LEARNER_STATUSES)[number];
export type ClaimOverlapLearnerDisposition = (typeof CLAIM_OVERLAP_LEARNER_DISPOSITIONS)[number];

export type ClaimOverlapLearnerCard = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  rank: 1 | 2 | 3;
  reasonCode: typeof CLAIM_OVERLAP_LAUNCH_REASON;
};

export type ClaimOverlapLaunchCommand = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  rank: 1 | 2 | 3;
};

/** Persistable recommendation. Empty dispositions carry no cards and no launch commands. */
export type ClaimOverlapLearnerSnapshot = {
  contractVersion: typeof CLAIM_OVERLAP_LEARNER_CONTRACT;
  algorithm: typeof CLAIM_OVERLAP_LEARNER_ALGORITHM;
  status: ClaimOverlapLearnerStatus;
  disposition: ClaimOverlapLearnerDisposition;
  gapClass: ClinicalClaimGapClass | null;
  reasonCodes: string[];
  claimId: string | null;
  claimVersionId: string | null;
  primaryEntityId: string | null;
  cards: ClaimOverlapLearnerCard[];
  launchCommands: ClaimOverlapLaunchCommand[];
};

export type ClaimOverlapAttemptEventV1 = {
  contractVersion: typeof CLAIM_OVERLAP_LEARNER_CONTRACT;
  requestId: string;
  provider: QuestionSourceProvider;
  nativeQuestionId: string;
  attemptId: string | null;
  identityStatus: "stable";
  sessionFingerprintHash: string;
  reviewState: "answered_review";
  correct: false;
  occurredAt: string;
  extensionVersion: string;
};

export type ClaimOverlapRecommendationRunV1 = {
  contractVersion: typeof CLAIM_OVERLAP_LEARNER_CONTRACT;
  recommendationRunId: string;
  attemptEventId: string;
  algorithm: typeof CLAIM_OVERLAP_LEARNER_ALGORITHM;
  status: (typeof CLAIM_OVERLAP_RUN_STATUSES)[number];
  snapshot: ClaimOverlapLearnerSnapshot;
  generatedAt: string;
  expiresAt: string;
};

export type ClaimOverlapLaunchRequestV1 = {
  contractVersion: typeof CLAIM_OVERLAP_LEARNER_CONTRACT;
  launchCommandId: string;
  recommendationItemId: string | null;
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  requestedAt: string;
  expiresAt: string;
};

export type ClaimOverlapLaunchAcknowledgementV1 = {
  contractVersion: typeof CLAIM_OVERLAP_LEARNER_CONTRACT;
  launchCommandId: string;
  status: (typeof CLAIM_OVERLAP_LAUNCH_STATUSES)[number];
  acknowledgedAt: string;
  reasonCode: string | null;
  resolvedNativeCardId: string | null;
  observedContentHash: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const REASON = /^[a-z0-9_]+$/;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isClaimOverlapLearnerSnapshot(value: unknown): value is ClaimOverlapLearnerSnapshot {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contractVersion !== CLAIM_OVERLAP_LEARNER_CONTRACT) return false;
  if (row.algorithm !== CLAIM_OVERLAP_LEARNER_ALGORITHM) return false;
  if (!(CLAIM_OVERLAP_LEARNER_STATUSES as readonly string[]).includes(row.status as string)) return false;
  if (!(CLAIM_OVERLAP_LEARNER_DISPOSITIONS as readonly string[]).includes(row.disposition as string)) return false;
  if (row.gapClass !== null && !(CLINICAL_CLAIM_GAP_CLASSES as readonly string[]).includes(row.gapClass as string)) return false;
  if (!Array.isArray(row.reasonCodes) || row.reasonCodes.some((code) => typeof code !== "string" || !REASON.test(code))) return false;
  if (!(row.claimId === null || isUuid(row.claimId))) return false;
  if (!(row.claimVersionId === null || isUuid(row.claimVersionId))) return false;
  if (!(row.primaryEntityId === null || isUuid(row.primaryEntityId))) return false;
  if (!Array.isArray(row.cards) || !Array.isArray(row.launchCommands)) return false;
  if (row.cards.length > CLAIM_OVERLAP_MAX_CARDS || row.launchCommands.length !== row.cards.length) return false;

  const served = row.disposition === "served";
  if (served !== (row.status === "completed")) return false;
  if (!served && (row.cards.length !== 0 || row.gapClass === "retrieval_gap")) return false;
  if (served && row.cards.length === 0) return false;
  if (row.disposition === "no_card" && row.gapClass !== "missing_card") return false;
  if (row.disposition === "not_a_miss" && row.gapClass !== null) return false;

  const cards = row.cards as Array<Record<string, unknown>>;
  const launches = row.launchCommands as Array<Record<string, unknown>>;
  const noteGuids = new Set<string>();
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const launch = launches[index];
    if (!card || !launch) return false;
    if (card.reasonCode !== CLAIM_OVERLAP_LAUNCH_REASON) return false;
    if (card.rank !== index + 1 || launch.rank !== card.rank) return false;
    if (![card.canonicalCardId, card.canonicalCardVersionId, launch.canonicalCardId, launch.canonicalCardVersionId].every(isUuid)) {
      return false;
    }
    if (card.canonicalCardId !== launch.canonicalCardId || card.canonicalCardVersionId !== launch.canonicalCardVersionId) return false;
    if (typeof card.noteGuid !== "string" || !SAFE_ID.test(card.noteGuid) || card.noteGuid !== launch.noteGuid) return false;
    if (!Number.isInteger(card.cardOrdinal) || (card.cardOrdinal as number) < 0 || card.cardOrdinal !== launch.cardOrdinal) return false;
    if (noteGuids.has(card.noteGuid)) return false;
    noteGuids.add(card.noteGuid);
    if ("deck" in card || "deckName" in card || "title" in launch || "deckName" in launch) return false;
  }
  return true;
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isClaimOverlapAttemptEventV1(value: unknown): value is ClaimOverlapAttemptEventV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === CLAIM_OVERLAP_LEARNER_CONTRACT
    && (QUESTION_SOURCE_PROVIDERS as readonly string[]).includes(row.provider as string)
    && isUuid(row.requestId)
    && typeof row.nativeQuestionId === "string" && SAFE_ID.test(row.nativeQuestionId)
    && (row.attemptId === null || (typeof row.attemptId === "string" && SAFE_ID.test(row.attemptId)))
    && row.identityStatus === "stable"
    && typeof row.sessionFingerprintHash === "string" && SHA256.test(row.sessionFingerprintHash)
    && row.reviewState === "answered_review"
    && row.correct === false
    && isIsoDateTime(row.occurredAt)
    && typeof row.extensionVersion === "string" && SAFE_ID.test(row.extensionVersion)
    && !("questionLinkId" in row)
    && !("canonicalEntityIds" in row);
}

export function isClaimOverlapRecommendationRunV1(value: unknown): value is ClaimOverlapRecommendationRunV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contractVersion !== CLAIM_OVERLAP_LEARNER_CONTRACT) return false;
  if (row.algorithm !== CLAIM_OVERLAP_LEARNER_ALGORITHM) return false;
  if (!(CLAIM_OVERLAP_RUN_STATUSES as readonly string[]).includes(row.status as string)) return false;
  if (!isUuid(row.recommendationRunId) || !isUuid(row.attemptEventId)) return false;
  if (!isIsoDateTime(row.generatedAt) || !isIsoDateTime(row.expiresAt)) return false;
  if (Date.parse(row.expiresAt as string) <= Date.parse(row.generatedAt as string)) return false;
  if (!isClaimOverlapLearnerSnapshot(row.snapshot)) return false;
  const snapshot = row.snapshot as ClaimOverlapLearnerSnapshot;
  if (snapshot.status === "not_a_miss") return false;
  if (row.status === "completed" && snapshot.disposition !== "served") return false;
  if (row.status === "abstain" && snapshot.disposition !== "abstain") return false;
  if (row.status === "no_card" && snapshot.disposition !== "no_card") return false;
  if (row.status !== "completed" && snapshot.cards.length !== 0) return false;
  return true;
}

export function isClaimOverlapLaunchRequestV1(value: unknown): value is ClaimOverlapLaunchRequestV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === CLAIM_OVERLAP_LEARNER_CONTRACT
    && [row.launchCommandId, row.canonicalCardId, row.canonicalCardVersionId]
      .every((id) => typeof id === "string" && UUID.test(id))
    && (row.recommendationItemId === null || (typeof row.recommendationItemId === "string" && UUID.test(row.recommendationItemId)))
    && typeof row.noteGuid === "string" && SAFE_ID.test(row.noteGuid)
    && Number.isInteger(row.cardOrdinal) && (row.cardOrdinal as number) >= 0
    && isIsoDateTime(row.requestedAt) && isIsoDateTime(row.expiresAt)
    && Date.parse(row.expiresAt as string) > Date.parse(row.requestedAt as string)
    && !("deckName" in row);
}

export function isClaimOverlapLaunchAcknowledgementV1(
  value: unknown,
): value is ClaimOverlapLaunchAcknowledgementV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === CLAIM_OVERLAP_LEARNER_CONTRACT
    && isUuid(row.launchCommandId)
    && (CLAIM_OVERLAP_LAUNCH_STATUSES as readonly string[]).includes(row.status as string)
    && isIsoDateTime(row.acknowledgedAt)
    && (row.reasonCode === null || (typeof row.reasonCode === "string" && SAFE_ID.test(row.reasonCode)))
    && (row.resolvedNativeCardId === null || (typeof row.resolvedNativeCardId === "string" && SAFE_ID.test(row.resolvedNativeCardId)))
    && (row.observedContentHash === null || (typeof row.observedContentHash === "string" && SHA256.test(row.observedContentHash)));
}

export function toClaimOverlapRecommendationRun(input: {
  recommendationRunId: string;
  attemptEventId: string;
  snapshot: ClaimOverlapLearnerSnapshot;
  generatedAt: string;
  expiresAt: string;
}): ClaimOverlapRecommendationRunV1 {
  if (input.snapshot.disposition === "not_a_miss") throw new Error("not_a_miss_is_not_persistable");
  const status = input.snapshot.disposition === "served"
    ? "completed"
    : input.snapshot.disposition === "no_card"
      ? "no_card"
      : "abstain";
  return {
    contractVersion: CLAIM_OVERLAP_LEARNER_CONTRACT,
    recommendationRunId: input.recommendationRunId,
    attemptEventId: input.attemptEventId,
    algorithm: CLAIM_OVERLAP_LEARNER_ALGORITHM,
    status,
    snapshot: input.snapshot,
    generatedAt: input.generatedAt,
    expiresAt: input.expiresAt,
  };
}
