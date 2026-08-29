import assert from 'node:assert/strict';
import { BROBOT_EXAMPLE_PROMPTS } from './example-prompts';
import { mapProfileToBroBotTrainingLevel } from './training-level';
import { shouldSubmitComposerOnEnter } from './composer-keyboard';
import { selectBroBotAnswerExtras } from './answer-display';

assert.equal(BROBOT_EXAMPLE_PROMPTS.length, 6);
assert.match(BROBOT_EXAMPLE_PROMPTS[0], /tibial plateau/i);

assert.equal(mapProfileToBroBotTrainingLevel({ trainingLevel: 'MD/DO Student' }), 'med_student');
assert.equal(mapProfileToBroBotTrainingLevel({ trainingLevel: 'MD/DO Resident', pgyYear: 3 }), 'pgy3');
assert.equal(mapProfileToBroBotTrainingLevel({ trainingLevel: 'MD/DO Resident' }), 'pgy2');
assert.equal(mapProfileToBroBotTrainingLevel({ trainingLevel: 'MD/DO Fellow' }), 'pgy5');
assert.equal(mapProfileToBroBotTrainingLevel({ trainingLevel: 'MD/DO Attending' }), 'attending');
assert.equal(mapProfileToBroBotTrainingLevel({ trainingLevel: '' }), null);

assert.equal(
  shouldSubmitComposerOnEnter({ key: 'Enter', shiftKey: false }, { isCoarsePointer: false, isNarrowViewport: false }),
  true,
);
assert.equal(
  shouldSubmitComposerOnEnter({ key: 'Enter', shiftKey: false }, { isCoarsePointer: true, isNarrowViewport: false }),
  false,
);
assert.equal(
  shouldSubmitComposerOnEnter({ key: 'Enter', shiftKey: false }, { isCoarsePointer: false, isNarrowViewport: true }),
  false,
);
assert.equal(
  shouldSubmitComposerOnEnter({ key: 'Enter', shiftKey: true }, { isCoarsePointer: false, isNarrowViewport: false }),
  false,
);

const extras = selectBroBotAnswerExtras({
  answer: 'Protect the superficial peroneal nerve during a lateral approach.',
  detectedMode: 'or_prep',
  pearl: 'Protect the superficial peroneal nerve during a lateral approach.',
  pitfall: 'Do not violate the posterior tibia cortex.',
  whatMostResidentsMiss: ['Varus collapse after failed fixation'],
});
assert.equal(extras.showPearl, false);
assert.equal(extras.showPitfall, true);
assert.deepEqual(extras.residentsMiss, ['Varus collapse after failed fixation']);

const consult = selectBroBotAnswerExtras({
  answer: 'Start with the neurovascular exam.',
  detectedMode: 'consult',
  consultConfidence: 'low',
  missingInformation: ['Laterality', 'Open vs closed'],
});
assert.equal(consult.showLowConfidenceConsult, true);
assert.equal(consult.consultMissing.length, 2);

console.log('brobot chat ui helper tests passed');
