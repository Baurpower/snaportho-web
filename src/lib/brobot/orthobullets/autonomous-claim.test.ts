import assert from 'node:assert/strict';
import { assembleEntityCandidates, assertionIdentity, machineConsensus, normalizeEntityLabel, parseAutonomousClaimCritique, parseAutonomousClaimDraft, safeTopicHint, vignetteRejectionCodes } from './autonomous-claim';

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
assert.equal(safeTopicHint('Fingertip Amputations & Finger Flaps'), 'Fingertip Amputations & Finger Flaps');
assert.equal(safeTopicHint('• Reverse cross finger • Axial flag flap • Thenar flap • Treatment'), null);
assert.equal(parseAutonomousClaimDraft({ ...draft, predicate: 'invented' }), null);

const critique = parseAutonomousClaimCritique({ accepted: true, confidence: 0.94, reasonCodes: ['entailed', 'numbers_match'] });
assert.ok(critique);
assert.deepEqual(machineConsensus(draft, critique), { accepted: true, confidence: 0.94, reasonCodes: ['entailed', 'numbers_match'] });
assert.equal(machineConsensus({ ...draft, confidence: 0.89 }, critique).accepted, false);
assert.equal(machineConsensus(draft, { ...critique, accepted: false }).accepted, false);

const entityId = '00000000-0000-4000-8000-000000000010';
const perineurium = {
  claimType: 'fact',
  primaryEntityId: entityId,
  predicate: 'teaches_fact',
  objectText: 'perineurium',
  qualifiers: {},
};
const surrounds = assertionIdentity({
  ...perineurium,
  claimText: 'The perineurium surrounds nerve fascicles.',
});
const continues = assertionIdentity({
  ...perineurium,
  claimText: 'The perineurium is continuous with the epineurium.',
});
assert.notEqual(surrounds, continues);
assert.equal(surrounds, assertionIdentity({
  ...perineurium,
  claimText: 'The   perineurium surrounds nerve fascicles.',
}));
assert.notEqual(
  assertionIdentity({ ...perineurium, claimText: 'Displacement greater than or equal to 2 mm needs fixation.' }),
  assertionIdentity({ ...perineurium, claimText: 'Displacement greater than 2 mm needs fixation.' }),
);

assert.deepEqual(
  vignetteRejectionCodes('In a 42-year-old male laborer with a partial median nerve laceration, the perineurium surrounds the fascicles.'),
  ['age_vignette', 'occupation_vignette'],
);
assert.deepEqual(
  vignetteRejectionCodes('Displaced femoral neck fractures in older adults are generally treated with arthroplasty.'),
  [],
);

const femoral = {
  id: '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a',
  preferredLabel: 'Femoral Neck Fracture',
  entityType: 'condition',
  normalizedLabel: 'femoral neck fracture',
};
const nerveSheath = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  preferredLabel: 'Perineurium',
  entityType: 'anatomy_structure',
  normalizedLabel: 'perineurium',
};
assert.equal(assembleEntityCandidates({
  labels: ['The Femoral Neck Fracture'],
  approved: [femoral, nerveSheath],
  links: [],
}).outcome, 'exact');
assert.equal(assembleEntityCandidates({
  labels: ['Femoral Neck Fracture'],
  approved: [femoral, { ...nerveSheath, normalizedLabel: 'femoral neck fracture' }],
  links: [],
}).outcome, 'ambiguous');
const weak = assembleEntityCandidates({
  labels: ['unmatched topic'],
  approved: [],
  links: [{ ...femoral, path: 'curriculum_node_bridge' }],
});
assert.equal(weak.outcome, 'choose');
assert.equal(weak.candidates[0]?.strength, 'weak');
assert.equal(assembleEntityCandidates({ labels: ['absent'], approved: [], links: [] }).outcome, 'none');

console.log('autonomous-claim.test.ts: all assertions passed');
