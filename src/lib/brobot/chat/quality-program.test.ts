import assert from 'node:assert/strict';

import { deriveBroBotConversationState, formatConversationStateForPrompt } from './conversation-state';
import { detectBroBotInteractionConstraints, formatInteractionConstraintsForPrompt } from './interaction-constraints';
import { evaluateBroBotResponseRelevance } from './relevance-gate';

const staged = detectBroBotInteractionConstraints({
  message: 'Quiz me on THA anatomy one at a time and give the answers after I respond.',
});
assert.equal(staged.stagedQuiz, true);
assert.match(formatInteractionConstraintsForPrompt(staged), /do not reveal the answer/i);
assert.deepEqual(
  evaluateBroBotResponseRelevance({
    question: 'Quiz me and give answers after I respond.',
    answer: 'Question: Which nerve is at risk? Correct answer: the sciatic nerve.',
    constraints: staged,
  }).warnings,
  ['staged_quiz_answer_revealed']
);

const duration = detectBroBotInteractionConstraints({ message: 'How long does distal-radius ORIF take?' });
assert.deepEqual(
  evaluateBroBotResponseRelevance({
    question: 'How long does distal-radius ORIF take?',
    answer: 'Check radial height, volar tilt, and dorsal screw penetration on fluoroscopy.',
    constraints: duration,
  }).warnings,
  ['newest_question_not_answered']
);
assert.equal(
  evaluateBroBotResponseRelevance({
    question: 'How long does distal-radius ORIF take?',
    answer: 'A routine case is often about 60–90 minutes, with complexity changing the estimate.',
    constraints: duration,
  }).passed,
  true
);

const evidence = detectBroBotInteractionConstraints({ message: 'Give me recent articles on posterior malleolus fixation.' });
assert.equal(evidence.evidenceRequest, true);
assert.deepEqual(
  evaluateBroBotResponseRelevance({
    question: 'Give me recent articles.',
    answer: 'Consider searching PubMed with specific keywords.',
    constraints: evidence,
  }).warnings,
  ['evidence_request_without_sources']
);

const history = [
  { role: 'user' as const, content: 'What are indications for EIP to APB transfer?' },
  { role: 'assistant' as const, content: 'The primary indication is ulnar nerve palsy.' },
];
const correction = detectBroBotInteractionConstraints({ message: 'No, APB is innervated by the median nerve.', history });
assert.equal(correction.explicitCorrection, true);
const state = deriveBroBotConversationState({
  message: 'No, APB is innervated by the median nerve.',
  history,
  topic: 'EIP opponensplasty',
  learnerLevel: 'pgy2',
});
assert.equal(state.correctedClaims.length, 1);
assert.match(formatConversationStateForPrompt(state), /replace prior claim/i);
assert.deepEqual(
  evaluateBroBotResponseRelevance({
    question: 'No, APB is innervated by the median nerve.',
    answer: 'Median nerve injury is another indication.',
    constraints: correction,
  }).warnings,
  ['correction_not_repaired']
);

const repeatHistory = [
  { role: 'user' as const, content: 'Cemented versus cementless TKA?' },
  { role: 'assistant' as const, content: 'Cemented fixation uses PMMA and cementless fixation relies on bone ingrowth.' },
];
const repeat = detectBroBotInteractionConstraints({ message: 'cemented vs cementless TKA', history: repeatHistory });
assert.equal(repeat.repeatedQuestion, true);
assert.match(formatInteractionConstraintsForPrompt(repeat), /materially different explanation/i);

const compare = detectBroBotInteractionConstraints({ message: 'Compare CR vs PS TKA for a medical student.' });
assert.equal(compare.compare, true);
assert.equal(compare.requestedLearnerLevel, 'medical student');

console.log('BroBot quality-program regression tests passed.');
