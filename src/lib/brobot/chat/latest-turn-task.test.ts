import assert from 'node:assert/strict';

process.env.BROBOT_LATEST_TURN_TASK_ENABLED = 'true';
process.env.BROBOT_OR_PREP_TASK_CONTRACT_ENABLED = 'true';

const {
  buildBroBotChatMessages,
  buildBroBotRevisionMessages,
  deriveBroBotLatestTurnTask,
  detectBroBotInteractionConstraints,
  evaluateBroBotResponseRelevance,
  fallbackBroBotIntentExpansion,
  runBroBotQualityGate,
} = await import('./index');

const durationQuestion = 'How long does distal-radius ORIF usually take?';
const durationConstraints = detectBroBotInteractionConstraints({ message: durationQuestion });
const durationTask = deriveBroBotLatestTurnTask({
  message: durationQuestion,
  topic: 'distal radius ORIF',
  constraints: durationConstraints,
});
assert.equal(durationTask.action, 'estimate_duration');
assert.ok(durationTask.mustAnswer.includes('a practical duration range'));
assert.ok(durationTask.mustNotSubstitute.includes('a fluoroscopy checklist'));

const durationIntent = fallbackBroBotIntentExpansion(durationQuestion, 'or_prep');
const durationPrompt = buildBroBotChatMessages({
  message: durationQuestion,
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
  intent: durationIntent,
})[0]?.content ?? '';
assert.match(durationPrompt, /LATEST USER TASK \(highest priority\)/);
assert.match(durationPrompt, /Requested action: estimate_duration/);
assert.match(durationPrompt, /OR PREP TASK CONTRACT/);
assert.match(durationPrompt, /duration_range/);

const conciseDuration = 'A routine distal-radius ORIF is often **60–90 minutes**; complex articular comminution, difficult exposure, revision surgery, and additional imaging can extend that estimate.';
const durationGate = runBroBotQualityGate({
  question: durationQuestion,
  answer: conciseDuration,
  mode: 'or_prep',
  responseDepth: 'standard',
  subintent: durationIntent.subintent,
  procedureOrTopic: durationIntent.procedureOrTopic,
});
assert.equal(durationGate.warnings.includes('answer_short_for_depth'), false);
assert.equal(durationGate.warnings.includes('or_prep_exposure_terms_missing'), false);
assert.equal(durationGate.warnings.includes('or_prep_named_anatomy_missing'), false);
assert.equal(evaluateBroBotResponseRelevance({
  question: durationQuestion,
  answer: conciseDuration,
  constraints: durationConstraints,
  mode: 'or_prep',
  subintent: durationIntent.subintent,
}).passed, true);

const wrongDuration = 'Check radial height, volar tilt, and dorsal screw penetration on fluoroscopy.';
assert.ok(evaluateBroBotResponseRelevance({
  question: durationQuestion,
  answer: wrongDuration,
  constraints: durationConstraints,
  mode: 'or_prep',
  subintent: durationIntent.subintent,
}).warnings.includes('newest_question_not_answered'));
const revisionPrompt = buildBroBotRevisionMessages({
  message: durationQuestion,
  mode: 'or_prep', responseDepth: 'standard', trainingLevel: 'pgy2', intent: durationIntent,
  originalResponse: wrongDuration, priorityPoints: [], knowledgeGaps: [], warnings: ['newest_question_not_answered'],
})[1]?.content ?? '';
assert.match(revisionPrompt, /did not perform the newest requested action/i);
assert.match(revisionPrompt, /duration_range/);

const compareQuestion = 'Compare nail versus plate fixation for a distal femur fracture.';
const compareConstraints = detectBroBotInteractionConstraints({ message: compareQuestion });
assert.ok(evaluateBroBotResponseRelevance({
  question: compareQuestion,
  answer: 'Both are fixation options for distal femur fractures.',
  constraints: compareConstraints,
  mode: 'or_prep',
  subintent: 'implant_options',
}).warnings.includes('comparison_not_completed'));
assert.equal(evaluateBroBotResponseRelevance({
  question: compareQuestion,
  answer: 'A nail favors adequate distal fixation and load sharing, whereas a plate offers more control for a very distal segment; choose based on geometry, alignment control, bone quality, and the failure risk of each construct.',
  constraints: compareConstraints,
  mode: 'or_prep',
  subintent: 'implant_options',
}).passed, true);

console.log('BroBot latest-turn and OR Prep task-contract tests passed.');
