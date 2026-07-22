export const ORTHOBULLETS_ANKI_CONTRACT_VERSION = "orthobullets-anki.v1" as const;
export const PATELLAR_INSTABILITY_ENTITY_ID = "1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a" as const;
export const MAX_RECOMMENDED_ANKI_CARDS = 3 as const;

export type OrthobulletsAnkiContractVersion = typeof ORTHOBULLETS_ANKI_CONTRACT_VERSION;
export type IsoDateTime = string;

export type IncorrectQuestionAttemptV1 = {
  contractVersion: OrthobulletsAnkiContractVersion;
  requestId: string;
  provider: "orthobullets";
  sourceQuestionId: string;
  sessionFingerprintHash: string;
  reviewState: "answered_review";
  correct: false;
  canonicalEntityIds: [typeof PATELLAR_INSTABILITY_ENTITY_ID];
  occurredAt: IsoDateTime;
  extensionVersion: string;
};

export type AnkiRecommendationCardV1 = {
  resourceType: "anki_card";
  canonicalCardId: string;
  canonicalCardVersionId: string;
  rank: 1 | 2 | 3;
  sharedCanonicalEntityIds: [typeof PATELLAR_INSTABILITY_ENTITY_ID];
  reasonCode: "reviewed_exact_entity_overlap";
  title: string | null;
  noteGuid: string;
  cardOrdinal: number;
};

export type DeterministicAnkiRecommendationV1 = {
  contractVersion: OrthobulletsAnkiContractVersion;
  recommendationRunId: string;
  attemptEventId: string;
  algorithm: "reviewed_exact_entity_overlap_v1";
  cards: AnkiRecommendationCardV1[];
  generatedAt: IsoDateTime;
  expiresAt: IsoDateTime;
};

export type ExactAnkiLaunchRequestV1 = {
  contractVersion: OrthobulletsAnkiContractVersion;
  launchCommandId: string;
  recommendationItemId: string;
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  requestedAt: IsoDateTime;
  expiresAt: IsoDateTime;
};

export type AnkiLaunchStatus =
  | "opened"
  | "not_found"
  | "ambiguous"
  | "unsupported"
  | "failed";

export type ExactAnkiLaunchAcknowledgementV1 = {
  contractVersion: OrthobulletsAnkiContractVersion;
  launchCommandId: string;
  status: AnkiLaunchStatus;
  acknowledgedAt: IsoDateTime;
  reasonCode: string | null;
  resolvedNativeCardId: string | null;
  observedContentHash: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const FORBIDDEN_CONTENT_KEYS = new Set([
  "stem", "question", "questionText", "answer", "answerText", "answerChoices",
  "choices", "correctAnswer", "selectedAnswer", "explanation", "image", "images",
  "rawHtml", "cardBody", "front", "back",
]);

export function containsProtectedEducationalContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsProtectedEducationalContent);
  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_CONTENT_KEYS.has(key) || containsProtectedEducationalContent(nested),
  );
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isIncorrectQuestionAttemptV1(value: unknown): value is IncorrectQuestionAttemptV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === ORTHOBULLETS_ANKI_CONTRACT_VERSION
    && row.provider === "orthobullets"
    && row.reviewState === "answered_review"
    && row.correct === false
    && typeof row.requestId === "string" && UUID.test(row.requestId)
    && typeof row.sourceQuestionId === "string" && SAFE_ID.test(row.sourceQuestionId)
    && typeof row.sessionFingerprintHash === "string" && SHA256.test(row.sessionFingerprintHash)
    && Array.isArray(row.canonicalEntityIds)
    && row.canonicalEntityIds.length === 1
    && row.canonicalEntityIds[0] === PATELLAR_INSTABILITY_ENTITY_ID
    && isIsoDateTime(row.occurredAt)
    && typeof row.extensionVersion === "string" && SAFE_ID.test(row.extensionVersion);
}

export function isDeterministicAnkiRecommendationV1(
  value: unknown,
): value is DeterministicAnkiRecommendationV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contractVersion !== ORTHOBULLETS_ANKI_CONTRACT_VERSION
    || row.algorithm !== "reviewed_exact_entity_overlap_v1"
    || typeof row.recommendationRunId !== "string" || !UUID.test(row.recommendationRunId)
    || typeof row.attemptEventId !== "string" || !UUID.test(row.attemptEventId)
    || !isIsoDateTime(row.generatedAt) || !isIsoDateTime(row.expiresAt)
    || !Array.isArray(row.cards) || row.cards.length > MAX_RECOMMENDED_ANKI_CARDS) return false;

  const ranks = new Set<number>();
  for (const [index, card] of (row.cards as Array<Record<string, unknown>>).entries()) {
    if (card.resourceType !== "anki_card"
      || typeof card.canonicalCardId !== "string" || !UUID.test(card.canonicalCardId)
      || typeof card.canonicalCardVersionId !== "string" || !UUID.test(card.canonicalCardVersionId)
      || card.rank !== index + 1 || ranks.has(card.rank as number)
      || card.reasonCode !== "reviewed_exact_entity_overlap"
      || !Array.isArray(card.sharedCanonicalEntityIds)
      || card.sharedCanonicalEntityIds.length !== 1
      || card.sharedCanonicalEntityIds[0] !== PATELLAR_INSTABILITY_ENTITY_ID
      || typeof card.noteGuid !== "string" || !SAFE_ID.test(card.noteGuid)
      || !Number.isInteger(card.cardOrdinal) || (card.cardOrdinal as number) < 0
      || !(card.title === null || (typeof card.title === "string" && card.title.length <= 300))) return false;
    ranks.add(card.rank as number);
  }
  return true;
}

export function isExactAnkiLaunchRequestV1(value: unknown): value is ExactAnkiLaunchRequestV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === ORTHOBULLETS_ANKI_CONTRACT_VERSION
    && [row.launchCommandId, row.recommendationItemId, row.canonicalCardId, row.canonicalCardVersionId]
      .every((id) => typeof id === "string" && UUID.test(id))
    && typeof row.noteGuid === "string" && SAFE_ID.test(row.noteGuid)
    && Number.isInteger(row.cardOrdinal) && (row.cardOrdinal as number) >= 0
    && isIsoDateTime(row.requestedAt) && isIsoDateTime(row.expiresAt)
    && Date.parse(row.expiresAt as string) > Date.parse(row.requestedAt as string);
}

export function isExactAnkiLaunchAcknowledgementV1(
  value: unknown,
): value is ExactAnkiLaunchAcknowledgementV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === ORTHOBULLETS_ANKI_CONTRACT_VERSION
    && typeof row.launchCommandId === "string" && UUID.test(row.launchCommandId)
    && ["opened", "not_found", "ambiguous", "unsupported", "failed"].includes(row.status as string)
    && isIsoDateTime(row.acknowledgedAt)
    && (row.reasonCode === null || (typeof row.reasonCode === "string" && SAFE_ID.test(row.reasonCode)))
    && (row.resolvedNativeCardId === null || (typeof row.resolvedNativeCardId === "string" && SAFE_ID.test(row.resolvedNativeCardId)))
    && (row.observedContentHash === null || (typeof row.observedContentHash === "string" && SHA256.test(row.observedContentHash)));
}
