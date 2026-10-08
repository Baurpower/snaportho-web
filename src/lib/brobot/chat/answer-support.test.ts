import assert from 'node:assert/strict';
import {
  buildAnswerAnchors,
  normalizeAnswerSupport,
  verifiedClaimIds,
} from './answer-support.ts';

const claimId = '00000000-0000-4000-8000-000000000101';
const answer =
  '- Displacement greater than 5 mm is an operative indication.\n\n- Assess radial nerve motor and sensory function before treatment.';
const anchors = buildAnswerAnchors(answer);
assert.equal(anchors.length, 2);
assert.match(anchors[0].id, /^0:0:0:/);

const supported = normalizeAnswerSupport({
  answer,
  raw: [{ answerText: anchors[0].text, claimIds: [claimId] }],
  claims: [
    {
      claimId,
      claimText: 'Displacement greater than 5 mm is an operative indication.',
    },
  ],
});
assert.equal(supported[0].verification, 'deterministic_verified');
assert.deepEqual(verifiedClaimIds(supported), [claimId]);

const rejected = normalizeAnswerSupport({
  answer,
  raw: [{ answerText: anchors[0].text, claimIds: [claimId] }],
  claims: [
    {
      claimId,
      claimText: 'Displacement greater than 10 mm is an operative indication.',
    },
  ],
});
assert.equal(rejected[0].verification, 'rejected');
assert.deepEqual(verifiedClaimIds(rejected), []);

assert.deepEqual(
  normalizeAnswerSupport({
    answer,
    raw: [{ answerText: 'Not visible', claimIds: [claimId] }],
    claims: [{ claimId, claimText: 'Anything' }],
  }),
  [],
);
console.log('answer-support.test.ts: all assertions passed');
