import assert from "node:assert/strict";

import { recommendClaimOverlapMiss, recordLearnerFeedback } from "./claim-overlap-learner";
import { queryFromGoldItem } from "./contracts/claim-overlap-v1";
import {
  isClaimOverlapAttemptEventV1,
  isClaimOverlapLaunchAcknowledgementV1,
  isClaimOverlapLaunchRequestV1,
  isClaimOverlapLearnerSnapshot,
  isClaimOverlapRecommendationRunV1,
  toClaimOverlapRecommendationRun,
} from "./contracts/claim-overlap-learner-v1";
import {
  QUESTION_SOURCE_IDENTITY_CONTRACT,
  buildQuestionSourceIdentity,
  type QuestionSourceIdentityV1,
} from "./contracts/question-source-identity-v1";
import { buildClaimOverlapGoldV1 } from "./fixtures/claim-overlap-gold-v1";

const { items, inventory } = buildClaimOverlapGoldV1();
const counts = { served: 0, abstain: 0, no_card: 0 };

for (const item of items) {
  const identity: QuestionSourceIdentityV1 = {
    contractVersion: QUESTION_SOURCE_IDENTITY_CONTRACT,
    provider: item.provider,
    nativeQuestionId: item.nativeQuestionId,
    attemptId: item.provider === "rock_himalaya" ? `attempt-${item.itemId}` : null,
    sourceFingerprintHash: item.sourceFingerprintHash,
    reviewState: "answered_review",
    correct: false,
    identityStatus: "stable",
    warnings: [],
  };
  const result = recommendClaimOverlapMiss({
    identity,
    testedClaim: queryFromGoldItem(item),
  }, inventory);
  const expected = item.expected.disposition === "serve" ? "served" : item.expected.disposition;
  assert.equal(isClaimOverlapLearnerSnapshot(result), true, item.itemId);
  assert.equal(result.disposition, expected, `${item.itemId} disposition`);
  assert.equal(result.gapClass, item.expected.gapClass, `${item.itemId} gap`);
  counts[result.disposition as "served" | "abstain" | "no_card"] += 1;

  if (expected === "served") {
    assert.equal(result.status, "completed");
    assert.equal(result.cards[0]?.canonicalCardId, item.expected.primaryCardId, item.itemId);
    assert.ok(result.cards.every((card) => item.expected.allowedCardIds.includes(card.canonicalCardId)), item.itemId);
    assert.equal(new Set(result.cards.map((card) => card.noteGuid)).size, result.cards.length, item.itemId);
    assert.deepEqual(
      result.launchCommands.map((command) => [command.noteGuid, command.cardOrdinal, command.rank]),
      result.cards.map((card) => [card.noteGuid, card.cardOrdinal, card.rank]),
      item.itemId,
    );
  } else {
    assert.equal(result.cards.length, 0, item.itemId);
    assert.equal(result.launchCommands.length, 0, item.itemId);
  }
  assert.equal(JSON.stringify(result).includes("deck"), false);
}

assert.equal(items.length, 50);
assert.deepEqual(Object.keys(counts).sort(), ["abstain", "no_card", "served"]);
for (const count of Object.values(counts)) assert.ok(count > 0);

const serveItem = items.find((item) => item.expected.disposition === "serve");
assert.ok(serveItem);
const serveIdentity: QuestionSourceIdentityV1 = {
  contractVersion: QUESTION_SOURCE_IDENTITY_CONTRACT,
  provider: serveItem.provider,
  nativeQuestionId: serveItem.nativeQuestionId,
  attemptId: "attempt-only",
  sourceFingerprintHash: serveItem.sourceFingerprintHash,
  reviewState: "answered_review",
  correct: false,
  identityStatus: "stable",
  warnings: [],
};

const drifted = recommendClaimOverlapMiss({
  identity: { ...serveIdentity, sourceFingerprintHash: "a".repeat(64) },
  testedClaim: queryFromGoldItem(serveItem),
}, inventory);
assert.equal(drifted.disposition, "abstain");
assert.equal(drifted.cards.length, 0);
assert.ok(drifted.reasonCodes.includes("source_fingerprint_drift"));

const correctAnswer = recommendClaimOverlapMiss({
  identity: { ...serveIdentity, correct: true },
  testedClaim: queryFromGoldItem(serveItem),
}, inventory);
assert.equal(correctAnswer.disposition, "not_a_miss");
assert.equal(correctAnswer.launchCommands.length, 0);

const attemptOnly = buildQuestionSourceIdentity({
  provider: "rock_himalaya",
  definitionId: 590424518,
  attemptId: 590424518,
  stem: "Synthetic stem.",
  choices: [{ text: "Synthetic choice" }],
  reviewVisible: true,
  correct: false,
});
const blocked = recommendClaimOverlapMiss({
  identity: attemptOnly,
  testedClaim: queryFromGoldItem(serveItem),
}, inventory);
assert.equal(blocked.disposition, "abstain");
assert.equal(blocked.gapClass, "source_extraction_gap");
assert.equal(blocked.cards.length, 0);
assert.ok(blocked.reasonCodes.includes("identity_not_stable"));

const served = recommendClaimOverlapMiss({
  identity: serveIdentity,
  testedClaim: queryFromGoldItem(serveItem),
}, inventory);
const feedback = recordLearnerFeedback(served, "not_helpful");
assert.equal(feedback.affectsMatch, false);
assert.deepEqual(feedback.cards.map((card) => card.canonicalCardId), served.cards.map((card) => card.canonicalCardId));

const attemptEvent = {
  contractVersion: "claim-overlap.v1" as const,
  requestId: "11111111-1111-4111-8111-111111111111",
  provider: serveItem.provider,
  nativeQuestionId: serveItem.nativeQuestionId,
  attemptId: serveIdentity.attemptId,
  identityStatus: "stable" as const,
  sessionFingerprintHash: serveItem.sourceFingerprintHash,
  reviewState: "answered_review" as const,
  correct: false as const,
  occurredAt: "2026-09-19T12:00:00.000Z",
  extensionVersion: "2026.09.19",
};
assert.equal(isClaimOverlapAttemptEventV1(attemptEvent), true);
assert.equal(isClaimOverlapAttemptEventV1({ ...attemptEvent, provider: "orthobullets", canonicalEntityIds: ["1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a"] }), false);
assert.equal(isClaimOverlapAttemptEventV1({ ...attemptEvent, stem: "protected" }), false);
assert.equal(isClaimOverlapAttemptEventV1({ ...attemptEvent, identityStatus: "attempt_id_only" }), false);

const run = toClaimOverlapRecommendationRun({
  recommendationRunId: "22222222-2222-4222-8222-222222222222",
  attemptEventId: "33333333-3333-4333-8333-333333333333",
  snapshot: served,
  generatedAt: "2026-09-19T12:00:01.000Z",
  expiresAt: "2026-09-19T12:15:01.000Z",
});
assert.equal(isClaimOverlapRecommendationRunV1(run), true);
assert.equal(run.status, "completed");

const emptyRun = toClaimOverlapRecommendationRun({
  recommendationRunId: "44444444-4444-4444-8444-444444444444",
  attemptEventId: "55555555-5555-4555-8555-555555555555",
  snapshot: drifted,
  generatedAt: "2026-09-19T12:00:01.000Z",
  expiresAt: "2026-09-19T12:15:01.000Z",
});
assert.equal(isClaimOverlapRecommendationRunV1(emptyRun), true);
assert.equal(emptyRun.status, "abstain");
assert.equal(emptyRun.snapshot.cards.length, 0);
assert.throws(() => toClaimOverlapRecommendationRun({
  recommendationRunId: run.recommendationRunId,
  attemptEventId: run.attemptEventId,
  snapshot: correctAnswer,
  generatedAt: run.generatedAt,
  expiresAt: run.expiresAt,
}), /not_a_miss_is_not_persistable/);

const launch = {
  contractVersion: "claim-overlap.v1" as const,
  launchCommandId: "66666666-6666-4666-8666-666666666666",
  recommendationItemId: null,
  canonicalCardId: served.cards[0].canonicalCardId,
  canonicalCardVersionId: served.cards[0].canonicalCardVersionId,
  noteGuid: served.cards[0].noteGuid,
  cardOrdinal: served.cards[0].cardOrdinal,
  requestedAt: "2026-09-19T12:01:00.000Z",
  expiresAt: "2026-09-19T12:03:00.000Z",
};
assert.equal(isClaimOverlapLaunchRequestV1(launch), true);
assert.equal(isClaimOverlapLaunchRequestV1({ ...launch, deckName: "Deck" }), false);
assert.equal(isClaimOverlapLaunchAcknowledgementV1({
  contractVersion: "claim-overlap.v1",
  launchCommandId: launch.launchCommandId,
  status: "opened",
  acknowledgedAt: "2026-09-19T12:01:01.000Z",
  reasonCode: null,
  resolvedNativeCardId: "123",
  observedContentHash: "b".repeat(64),
}), true);

console.log(`claim-overlap-learner.test.ts: 50 gold items ${JSON.stringify(counts)}`);
