import assert from 'node:assert/strict';

import { preRouteBroBotIntent } from './pre-router';

const broadPrompts = [
  ['What are the steps for ankle ORIF?', 'fracture_orif', /fluoroscopy|intraoperative checks/i],
  ['What are the steps for distal radius ORIF?', 'fracture_orif', /reduction strategy/i],
  ['Walk me through tibial plateau ORIF.', 'fracture_orif', /classification-specific pathway/i],
  ['What are the steps for olecranon ORIF?', 'fracture_orif', /implant\/fixation/i],
  ['Diagnostic shoulder scope.', 'arthroscopy', /portal placement/i],
  ['What are the steps for reverse TSA?', 'arthroplasty', /trialing \/ balancing/i],
  ['How do you do trigger finger release?', 'soft_tissue_release', /release endpoint/i],
  ['ACL reconstruction steps.', 'tendon_ligament_repair', /graft\/repair choice/i],
] as const;

for (const [message, expectedCategory, expectedBranch] of broadPrompts) {
  const intent = preRouteBroBotIntent({ message, selectedMode: 'auto' });
  assert.equal(intent.source, 'local', message);
  assert.equal(intent.mode, 'or_prep', message);
  assert.equal(intent.procedureCategory, expectedCategory, message);
  assert.equal(intent.requiresBranchSelection, true, message);
  assert.equal(intent.answerImmediately, false, message);
  assert.ok(
    intent.branchOptions.some((branch) => expectedBranch.test(branch.label)),
    `${message} should include ${expectedBranch}`
  );
}

const fcr = preRouteBroBotIntent({
  message: 'What structures are at risk in the FCR approach?',
  selectedMode: 'auto',
});
assert.equal(fcr.mode, 'or_prep');
assert.equal(fcr.subintent, 'anatomy_at_risk');
assert.equal(fcr.requiresBranchSelection, false);
assert.equal(fcr.answerImmediately, true);

const intertroch = preRouteBroBotIntent({
  message: 'What is the starting point for an intertroch nail?',
  selectedMode: 'auto',
});
assert.equal(intertroch.mode, 'or_prep');
assert.equal(intertroch.procedureCategory, 'fracture_orif');
assert.equal(intertroch.requiresBranchSelection, false);
assert.equal(intertroch.answerImmediately, true);

// --- P0 micro-mode routing tests ---

const approachQuestion = preRouteBroBotIntent({
  message: 'What is the approach to the proximal humerus?',
  selectedMode: 'auto',
});
assert.equal(approachQuestion.subintent, 'surgical_approach');

const incisionQuestion = preRouteBroBotIntent({
  message: 'What incision do you use for a deltopectoral exposure?',
  selectedMode: 'auto',
});
assert.equal(incisionQuestion.subintent, 'surgical_approach');

const classificationQuestion = preRouteBroBotIntent({
  message: 'How do I classify this fracture?',
  selectedMode: 'auto',
});
assert.equal(classificationQuestion.subintent, 'classification');
assert.notEqual(classificationQuestion.subintent, 'treatment_algorithm');

const indicationsQuestion = preRouteBroBotIntent({
  message: 'What are the indications for this procedure?',
  selectedMode: 'auto',
});
assert.equal(indicationsQuestion.subintent, 'indications');

const patientExplanationQuestion = preRouteBroBotIntent({
  message: 'How would you explain to the patient what this surgery involves?',
  selectedMode: 'auto',
});
assert.equal(patientExplanationQuestion.subintent, 'patient_explanation');

// Anatomy-at-risk questions should still win even when "approach" also appears.
assert.equal(fcr.subintent, 'anatomy_at_risk');

// --- Smart chip generation tests ---

const proximalHumerusApproach = preRouteBroBotIntent({
  message: 'What is the approach to the proximal humerus?',
  selectedMode: 'auto',
});
assert.deepEqual(
  proximalHumerusApproach.branchOptions.map((option) => option.label),
  [
    'Deltopectoral steps',
    'Axillary nerve risk',
    'Deltoid-split alternative',
    'Extend the exposure',
    'Common mistakes',
    'Attending pimp questions',
    'OITE traps',
  ]
);

const ankleFractureClassification = preRouteBroBotIntent({
  message: 'How do I classify ankle fractures?',
  selectedMode: 'auto',
});
assert.deepEqual(
  ankleFractureClassification.branchOptions.map((option) => option.label),
  [
    'Weber vs Lauge-Hansen',
    'Stress views',
    'Syndesmosis clues',
    'Treatment implications',
    'Common traps',
    'OITE questions',
  ]
);

const reverseTsaIndications = preRouteBroBotIntent({
  message: 'Indications for reverse TSA?',
  selectedMode: 'auto',
});
assert.deepEqual(
  reverseTsaIndications.branchOptions.map((option) => option.label),
  [
    'Cuff tear arthropathy',
    'Fracture indications',
    'Contraindications',
    'Anatomic vs reverse TSA',
    'Complication profile',
    'Key papers',
  ]
);

// Unknown topic + curated subintent should still get question-type-specific
// chips (tier 2), not the fully generic mode/category templates.
const unknownApproachTopic = preRouteBroBotIntent({
  message: 'What is the approach to the elbow?',
  selectedMode: 'auto',
});
assert.equal(unknownApproachTopic.subintent, 'surgical_approach');
assert.ok(
  unknownApproachTopic.branchOptions.every(
    (option) => !['Surgical details', 'Complications', 'Tell me more'].includes(option.label)
  )
);
assert.ok(unknownApproachTopic.branchOptions.some((option) => option.label === 'Internervous plane'));

// Fallback for completely unrelated/non-curated questions must be unchanged
// (existing branch-template output shape).
const unrelatedSteps = preRouteBroBotIntent({
  message: 'What are the steps for ankle ORIF?',
  selectedMode: 'auto',
});
assert.equal(unrelatedSteps.subintent, 'surgical_steps');
assert.ok(
  unrelatedSteps.branchOptions.some((option) => option.id === 'general_or_flow')
);

// --- Entity-based procedureOrTopic (P0-1) ---

// procedureOrTopic should be the extracted entity, not the whole question.
assert.equal(
  preRouteBroBotIntent({
    message: 'What is the approach to the proximal humerus?',
    selectedMode: 'auto',
  }).procedureOrTopic,
  'proximal humerus'
);
assert.equal(
  preRouteBroBotIntent({
    message: 'Indications for reverse TSA?',
    selectedMode: 'auto',
  }).procedureOrTopic,
  'reverse total shoulder arthroplasty'
);

// Unknown / entity-free message falls back to the raw slice (shape unchanged).
const noEntity = preRouteBroBotIntent({
  message: 'Tell me something interesting',
  selectedMode: 'auto',
});
assert.equal(noEntity.procedureOrTopic, 'Tell me something interesting');

console.log('BroBot pre-router tests passed');
