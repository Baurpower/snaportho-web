import assert from 'node:assert/strict';
import { machineConsensus, normalizeEntityLabel, parseAutonomousClaimCritique, parseAutonomousClaimDraft } from './autonomous-claim';

const draft = parseAutonomousClaimDraft({
  claimText: 'Displaced femoral neck fractures in older adults are generally treated with arthroplasty.',
  claimType: 'treatment_indication',
  predicate: 'preferred_treatment',
  objectText: 'arthroplasty',
  qualifiers: { age_group: 'older adult', setting: 'displaced fracture', unknown: 'removed' },
  primaryEntityLabel: 'Femoral Neck Fracture',
  primaryEntityType: 'condition',
  confidence: 0.96,
});
assert.ok(draft);
assert.deepEqual(draft.qualifiers, { age_group: 'older adult', setting: 'displaced fracture' });
assert.equal(normalizeEntityLabel('  Femoral-neck   Fracture '), 'femoral-neck fracture');
assert.equal(parseAutonomousClaimDraft({ ...draft, predicate: 'invented' }), null);

const critique = parseAutonomousClaimCritique({ accepted: true, confidence: 0.94, reasonCodes: ['entailed', 'numbers_match'] });
assert.ok(critique);
assert.deepEqual(machineConsensus(draft, critique), { accepted: true, confidence: 0.94, reasonCodes: ['entailed', 'numbers_match'] });
assert.equal(machineConsensus({ ...draft, confidence: 0.89 }, critique).accepted, false);
assert.equal(machineConsensus(draft, { ...critique, accepted: false }).accepted, false);

console.log('autonomous-claim.test.ts: all assertions passed');
