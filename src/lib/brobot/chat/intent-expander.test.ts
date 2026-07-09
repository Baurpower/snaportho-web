import assert from 'node:assert/strict';

import {
  fallbackBroBotIntentExpansion,
  getModeBranchOptions,
  parseBroBotIntentExpansionResponse,
} from './intent-expander';

const examples = [
  ['Diagnostic shoulder scope', 'or_prep'],
  ['Reverse TSA', 'or_prep'],
  ['Tibial plateau ORIF', 'or_prep'],
  ['Ankle fracture consult', 'consult'],
  ['Painful TKA', 'consult'],
  ['SCFE', 'oite'],
  ['Shoulder pain workup', 'clinic'],
  ['Critique this RCT', 'research'],
] as const;

for (const [message, expectedMode] of examples) {
  const intent = fallbackBroBotIntentExpansion(message, 'auto');
  assert.equal(intent.mode, expectedMode, message);
  assert.ok(intent.branchOptions?.length, `${message} should include branch options`);
}

const emergency = fallbackBroBotIntentExpansion('Open fracture consult', 'auto');
assert.equal(emergency.mode, 'consult');
assert.equal(emergency.answerImmediately, true);

const ankleOrif = fallbackBroBotIntentExpansion('What are the steps for an ankle ORIF?', 'auto');
assert.equal(ankleOrif.mode, 'or_prep');
assert.equal(ankleOrif.subintent, 'surgical_steps');
assert.equal(ankleOrif.procedureCategory, 'fracture_orif');
assert.equal(ankleOrif.answerImmediately, true);
assert.equal(ankleOrif.requiresBranchSelection, false);
assert.ok(
  ankleOrif.branchOptions?.some((branch) => /fracture pattern/i.test(branch.label))
);
assert.ok(
  ankleOrif.branchOptions?.some((branch) => /reduce/i.test(branch.label))
);
assert.ok(
  ankleOrif.branchOptions?.some((branch) => /fixation options/i.test(branch.label))
);
assert.ok(
  ankleOrif.branchOptions?.some((branch) => /fluoro checks/i.test(branch.label))
);

const isolatedLateral = fallbackBroBotIntentExpansion(
  'What are the steps for an isolated lateral malleolus ORIF?',
  'auto'
);
assert.equal(isolatedLateral.mode, 'or_prep');
assert.equal(isolatedLateral.procedureCategory, 'fracture_orif');
assert.equal(isolatedLateral.requiresBranchSelection, false);

const broadOrPrepPrompts = [
  ['Distal radius ORIF steps', 'fracture_orif', /reduction maneuvers/i],
  ['I have tibial plateau ORIF tomorrow', 'fracture_orif', /fracture pattern/i],
  ['Walk me through olecranon ORIF', 'fracture_orif', /fixation options/i],
  ['Diagnostic shoulder scope steps', 'arthroscopy', /portals/i],
  ['Reverse TSA steps', 'arthroplasty', /balance and stability|bone prep/i],
  ['Trigger finger release', 'soft_tissue_release', /release is complete/i],
  ['ACL reconstruction steps', 'tendon_ligament_repair', /graft/i],
] as const;

for (const [message, expectedCategory, expectedBranch] of broadOrPrepPrompts) {
  const intent = fallbackBroBotIntentExpansion(message, 'auto');
  assert.equal(intent.mode, 'or_prep', message);
  assert.equal(intent.procedureCategory, expectedCategory, message);
  assert.equal(intent.requiresBranchSelection, false, message);
  assert.equal(intent.answerImmediately, true, message);
  assert.ok(
    intent.branchOptions?.some((branch) => expectedBranch.test(branch.label)),
    `${message} should include category branch matching ${expectedBranch}`
  );
}

const diagnosticShoulderScope = fallbackBroBotIntentExpansion(
  'What are the diagnostic steps of a shoulder scope?',
  'auto'
);
assert.equal(diagnosticShoulderScope.mode, 'or_prep');
assert.equal(diagnosticShoulderScope.procedureCategory, 'arthroscopy');
assert.equal(diagnosticShoulderScope.answerImmediately, true);
assert.equal(diagnosticShoulderScope.requiresBranchSelection, false);

const fcrApproach = fallbackBroBotIntentExpansion(
  'What structures are at risk in the FCR approach?',
  'auto'
);
assert.equal(fcrApproach.mode, 'or_prep');
assert.equal(fcrApproach.subintent, 'anatomy_at_risk');
assert.equal(fcrApproach.procedureCategory, 'unknown');
assert.equal(fcrApproach.answerImmediately, true);
assert.equal(fcrApproach.requiresBranchSelection, false);

const intertrochStartingPoint = fallbackBroBotIntentExpansion(
  'What is the starting point for an intertroch nail?',
  'auto'
);
assert.equal(intertrochStartingPoint.mode, 'or_prep');
assert.equal(intertrochStartingPoint.procedureCategory, 'fracture_orif');
assert.equal(intertrochStartingPoint.answerImmediately, true);
assert.equal(intertrochStartingPoint.requiresBranchSelection, false);

const a1Pulley = fallbackBroBotIntentExpansion(
  'How do I identify the A1 pulley?',
  'auto'
);
assert.equal(a1Pulley.mode, 'or_prep');
assert.equal(a1Pulley.procedureCategory, 'soft_tissue_release');
assert.equal(a1Pulley.answerImmediately, true);
assert.equal(a1Pulley.requiresBranchSelection, false);

const parsed = parseBroBotIntentExpansionResponse(
  JSON.stringify({
    mode: 'or_prep',
    subintent: 'diagnostic_sequence',
    procedureCategory: 'arthroscopy',
    goal: 'Learn the diagnostic shoulder arthroscopy workflow.',
    procedureOrTopic: 'diagnostic shoulder arthroscopy',
    ambiguity: 'moderate',
    assumedContext: '',
    missingContext: ['specific joint', 'attending preference'],
    branchOptions: [
      { id: 'portal_placement', label: 'Portal Placement' },
      { id: 'diagnostic_sequence', label: 'Diagnostic Sequence' },
      { id: 'structures_to_inspect', label: 'Structures To Inspect' },
    ],
    answerImmediately: false,
    requiresBranchSelection: true,
    reasonForBranching: 'The sequence depends on portals and diagnostic goal.',
    confidence: 0.8,
  }),
  { message: 'Diagnostic shoulder scope', selectedMode: 'auto' }
);

assert.equal(parsed.mode, 'or_prep');
assert.equal(parsed.procedureCategory, 'arthroscopy');
assert.equal(parsed.goal, 'Learn the diagnostic shoulder arthroscopy workflow.');
assert.equal(parsed.answerImmediately, true);
assert.equal(parsed.requiresBranchSelection, false);
assert.ok(parsed.branchOptions?.some((branch) => /portal/i.test(branch.label)));

assert.deepEqual(
  getModeBranchOptions('oite').map((branch) => branch.label).slice(0, 3),
  [
    'What are the board-style pearls?',
    'What must I know first?',
    'What classification should I know?',
  ]
);

console.log('BroBot intent expander tests passed');
