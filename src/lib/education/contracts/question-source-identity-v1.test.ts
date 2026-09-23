import assert from "node:assert/strict";

import {
  buildQuestionSourceIdentity,
  evaluateSanitizedIdentityCapture,
  isQuestionSourceIdentityV1,
  sha256Hex,
  sourceFingerprintHash,
} from "./question-source-identity-v1.ts";

assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");

const stem = "A synthetic stem about a sanitized plateau injury.";
const choices = [{ text: "Cast" }, { text: "Fixation" }];
const first = sourceFingerprintHash({
  provider: "rock_himalaya",
  nativeQuestionId: "4242",
  stem,
  choices,
});
const second = sourceFingerprintHash({
  provider: "rock_himalaya",
  nativeQuestionId: "4242",
  stem: "  A   synthetic STEM about a sanitized plateau injury. ",
  choices: [{ text: "Fixation" }, { text: " cast " }],
});
assert.equal(first, second, "fingerprint is case- and order-insensitive");
assert.notEqual(
  first,
  sourceFingerprintHash({ provider: "rock_himalaya", nativeQuestionId: "4243", stem, choices }),
);

const obq = buildQuestionSourceIdentity({
  provider: "orthobullets",
  definitionId: "https://www.orthobullets.com/testview?qid=obq24-001",
  stem,
  choices,
  reviewVisible: true,
  correct: false,
});
assert.equal(obq.nativeQuestionId, "OBQ24-001");
assert.equal(obq.identityStatus, "stable");
assert.equal(obq.correct, false);
assert.equal(isQuestionSourceIdentityV1(obq), true);
assert.equal(isQuestionSourceIdentityV1({ ...obq, stem }), false);

const report = evaluateSanitizedIdentityCapture();
assert.deepEqual(report.failures, []);
assert.ok(report.stableRate >= 0.99);
assert.ok(report.reviewRate >= 0.95);
assert.equal(report.stableEligible, 80);
assert.equal(report.reviewEligible, 80);

console.log("question-source-identity-v1.test.ts: all assertions passed");
