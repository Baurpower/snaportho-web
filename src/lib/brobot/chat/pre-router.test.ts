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

console.log('BroBot pre-router tests passed');
