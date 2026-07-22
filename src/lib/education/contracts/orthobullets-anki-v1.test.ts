import assert from "node:assert/strict";

// @ts-expect-error TS5097: explicit .ts suffix is required by the direct Node test runner.
import * as contract from "./orthobullets-anki-v1.ts";

const {
  ORTHOBULLETS_ANKI_CONTRACT_VERSION, PATELLAR_INSTABILITY_ENTITY_ID,
  containsProtectedEducationalContent, isDeterministicAnkiRecommendationV1,
  isExactAnkiLaunchAcknowledgementV1, isExactAnkiLaunchRequestV1,
  isIncorrectQuestionAttemptV1,
} = contract;

const ids = {
  request: "11111111-1111-4111-8111-111111111111",
  attempt: "22222222-2222-4222-8222-222222222222",
  run: "33333333-3333-4333-8333-333333333333",
  item: "44444444-4444-4444-8444-444444444444",
  card: "55555555-5555-4555-8555-555555555555",
  version: "66666666-6666-4666-8666-666666666666",
  command: "77777777-7777-4777-8777-777777777777",
};

const attempt = {
  contractVersion: ORTHOBULLETS_ANKI_CONTRACT_VERSION,
  requestId: ids.request,
  provider: "orthobullets",
  sourceQuestionId: "1096",
  sessionFingerprintHash: "a".repeat(64),
  reviewState: "answered_review",
  correct: false,
  canonicalEntityIds: [PATELLAR_INSTABILITY_ENTITY_ID],
  occurredAt: "2026-07-20T12:00:00.000Z",
  extensionVersion: "2026.07.20",
};
assert.equal(isIncorrectQuestionAttemptV1(attempt), true);
assert.equal(isIncorrectQuestionAttemptV1({ ...attempt, correct: true }), false);
assert.equal(isIncorrectQuestionAttemptV1({ ...attempt, provider: "rock" }), false);
assert.equal(isIncorrectQuestionAttemptV1({ ...attempt, explanation: "protected" }), false);

const card = {
  resourceType: "anki_card",
  canonicalCardId: ids.card,
  canonicalCardVersionId: ids.version,
  rank: 1,
  sharedCanonicalEntityIds: [PATELLAR_INSTABILITY_ENTITY_ID],
  reasonCode: "reviewed_exact_entity_overlap",
  title: "Patellar instability",
  noteGuid: "anki-guid-1",
  cardOrdinal: 0,
};
const recommendation = {
  contractVersion: ORTHOBULLETS_ANKI_CONTRACT_VERSION,
  recommendationRunId: ids.run,
  attemptEventId: ids.attempt,
  algorithm: "reviewed_exact_entity_overlap_v1",
  cards: [card],
  generatedAt: "2026-07-20T12:00:01.000Z",
  expiresAt: "2026-07-20T12:05:01.000Z",
};
assert.equal(isDeterministicAnkiRecommendationV1(recommendation), true);
assert.equal(isDeterministicAnkiRecommendationV1({ ...recommendation, cards: [card, { ...card }] }), false);
assert.equal(isDeterministicAnkiRecommendationV1({ ...recommendation, cards: [{ ...card, rank: 2 }] }), false);
assert.equal(isDeterministicAnkiRecommendationV1({ ...recommendation, cards: [card, { ...card, rank: 2 }, { ...card, rank: 3 }, { ...card, rank: 4 }] }), false);
assert.equal(containsProtectedEducationalContent({ safe: { answerChoices: ["A"] } }), true);

const launch = {
  contractVersion: ORTHOBULLETS_ANKI_CONTRACT_VERSION,
  launchCommandId: ids.command,
  recommendationItemId: ids.item,
  canonicalCardId: ids.card,
  canonicalCardVersionId: ids.version,
  noteGuid: "anki-guid-1",
  cardOrdinal: 0,
  requestedAt: "2026-07-20T12:01:00.000Z",
  expiresAt: "2026-07-20T12:03:00.000Z",
};
assert.equal(isExactAnkiLaunchRequestV1(launch), true);
assert.equal(isExactAnkiLaunchRequestV1({ ...launch, expiresAt: launch.requestedAt }), false);

const ack = {
  contractVersion: ORTHOBULLETS_ANKI_CONTRACT_VERSION,
  launchCommandId: ids.command,
  status: "opened",
  acknowledgedAt: "2026-07-20T12:01:05.000Z",
  reasonCode: null,
  resolvedNativeCardId: "123456789",
  observedContentHash: "b".repeat(64),
};
assert.equal(isExactAnkiLaunchAcknowledgementV1(ack), true);
assert.equal(isExactAnkiLaunchAcknowledgementV1({ ...ack, status: "maybe" }), false);

console.log("orthobullets-anki-v1.test.ts: all assertions passed");
