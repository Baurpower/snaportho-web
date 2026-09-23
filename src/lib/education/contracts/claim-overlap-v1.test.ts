import assert from "node:assert/strict";

import { evaluateClaimOverlap } from "../claim-overlap-eval";
import { matchClaimOverlap } from "../claim-overlap-matcher";
import {
  CLAIM_OVERLAP_ALGORITHM,
  CLAIM_OVERLAP_DELTA,
  CLAIM_OVERLAP_GATES,
  CLAIM_OVERLAP_GOLD_SIZE,
  CLAIM_OVERLAP_TAU,
  goldSetMixErrors,
  isClaimOverlapGoldItem,
  queryFromGoldItem,
} from "./claim-overlap-v1";
import { buildClaimOverlapGoldV1 } from "../fixtures/claim-overlap-gold-v1";
import { containsProtectedEducationalContent } from "./clinical-claim-v1";

assert.equal(CLAIM_OVERLAP_ALGORITHM, "claim-overlap.v1");
assert.equal(CLAIM_OVERLAP_TAU, 0.9);
assert.equal(CLAIM_OVERLAP_DELTA, 0.05);
assert.equal(CLAIM_OVERLAP_GATES.precisionAt1, 0.9);
assert.equal(CLAIM_OVERLAP_GATES.incorrectCardRate, 0.02);

const gold = buildClaimOverlapGoldV1();
assert.equal(gold.items.length, CLAIM_OVERLAP_GOLD_SIZE);
assert.deepEqual(goldSetMixErrors(gold.items), []);
assert.equal(gold.items.every(isClaimOverlapGoldItem), true);
assert.equal(gold.items.filter((item) => item.provider === "orthobullets").length, 25);
assert.equal(gold.items.filter((item) => item.provider === "rock_himalaya").length, 25);
assert.equal(gold.items.some((item) => item.format === "image"), true);
assert.equal(gold.items.some((item) => item.format === "algorithm"), true);
assert.equal(gold.items.filter((item) => item.expected.disposition === "no_card").length >= 3, true);
assert.equal(gold.items.some((item) => containsProtectedEducationalContent(item)), false);
assert.doesNotMatch(JSON.stringify(gold.items), /"stem"|"explanation"|"answerChoices"/);

const evalResult = evaluateClaimOverlap(gold.items, gold.inventory);
assert.equal(evalResult.algorithmVersion, CLAIM_OVERLAP_ALGORITHM);
assert.equal(evalResult.gatesPassed, true, JSON.stringify(evalResult.gateFailures));
assert.equal(evalResult.incorrectCardRate, 0);
assert.equal(evalResult.siblingDuplicateRate, 0);
assert.ok(evalResult.precisionAt1 >= CLAIM_OVERLAP_GATES.precisionAt1);
assert.ok(evalResult.precisionAt3 >= CLAIM_OVERLAP_GATES.precisionAt3);
assert.equal(evalResult.falseEmptyCount, 0);

const serveItem = gold.items.find((item) => item.expected.disposition === "serve")!;
const serveMatch = matchClaimOverlap(queryFromGoldItem(serveItem), gold.inventory);
assert.equal(serveMatch.disposition, "served");
assert.equal(serveMatch.cards[0]?.canonicalCardId, serveItem.expected.primaryCardId);
assert.ok(serveMatch.cards.every((card) => serveItem.expected.allowedCardIds.includes(card.canonicalCardId)));
assert.equal(serveMatch.cards[0]?.role, "must_learn");

const noCardItem = gold.items.find((item) => item.expected.disposition === "no_card")!;
assert.equal(matchClaimOverlap(queryFromGoldItem(noCardItem), gold.inventory).disposition, "no_card");

const siblingItem = gold.items.find((item) => item.rationale.includes("Sibling cloze"))!;
const siblingMatch = matchClaimOverlap(queryFromGoldItem(siblingItem), gold.inventory);
assert.equal(siblingMatch.cards.length, 1);
assert.equal(new Set(siblingMatch.cards.map((card) => card.noteGuid)).size, 1);

const holdItem = gold.items.find((item) => item.format === "contraindication")!;
assert.equal(matchClaimOverlap(queryFromGoldItem(holdItem), gold.inventory).reasonCodes.includes("safety_hold"), true);

const ambiguousItem = gold.items.find((item) => item.rationale.includes("below tau"))!;
const ambiguousMatch = matchClaimOverlap(queryFromGoldItem(ambiguousItem), gold.inventory);
assert.equal(ambiguousMatch.disposition, "abstain");
assert.equal(ambiguousMatch.cards.length, 0);

const poisoned = structuredClone(gold.inventory);
const decoyLink = poisoned.links.find((link) => (
  !gold.items[0].expected.allowedCardIds.includes(link.canonicalCardId)
  && link.claimId !== serveItem.expected.primaryCardId
));
assert.ok(decoyLink);
const targetClaim = poisoned.claims.find((claim) => (
  claim.fingerprintHash === serveItem.testedClaim.fingerprintHash
))!;
poisoned.links.push({
  ...decoyLink,
  claimId: targetClaim.claimId,
  claimVersionId: targetClaim.currentVersionId!,
  canonicalCardId: decoyLink.canonicalCardId,
});
const poisonedEval = evaluateClaimOverlap([serveItem], poisoned);
assert.equal(poisonedEval.gatesPassed, false);
assert.ok(poisonedEval.gateFailures.includes("incorrect_card_rate"));

const again = evaluateClaimOverlap(gold.items, gold.inventory);
assert.deepEqual(evalResult, again);

assert.equal(isClaimOverlapGoldItem({ ...serveItem, testedClaim: { ...serveItem.testedClaim, fingerprintHash: "a".repeat(64) } }), false);
assert.equal(isClaimOverlapGoldItem({ ...serveItem, stem: "protected" }), false);

console.log("claim-overlap-v1.test.ts: all assertions passed");
