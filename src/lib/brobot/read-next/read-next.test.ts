import assert from 'node:assert/strict';

import { adaptLegacyBranchesToReadNextCandidates } from './adapters';
import { filterReadNextCandidates } from './candidate-filter';
import { rankReadNextCandidates } from './candidate-ranker';
import { selectDiverseReadNextCandidates } from './candidate-selector';
import { evaluateReadNextShadow, isReadNextShadowEnabled } from './shadow';
import type { ReadNextContextPacket } from './types';

const context: ReadNextContextPacket = {
  latestUserRequest: 'What is the treatment for a displaced femoral neck fracture?',
  latestVisibleAnswer: 'Treatment depends on age and displacement.',
  mode: 'general', learnerLevel: 'pgy2', activeTopic: 'femoral neck fracture',
  answeredQuestions: ['What is the Garden classification?'], corrections: [],
  previouslyExposedHashes: [], stagedQuiz: false, compare: false,
  evidenceRequest: false, explicitCorrection: false, patientSpecific: false, urgent: false,
};

const branches = [
  { id: 'repeat', label: 'What is the treatment for a displaced femoral neck fracture?' },
  { id: 'answered', label: 'What is the Garden classification?', category: 'classification' },
  { id: 'good', label: 'How does age change arthroplasty selection for femoral neck fractures?', category: 'decision' },
  { id: 'near', label: 'How does patient age alter arthroplasty selection in femoral neck fractures?', category: 'decision' },
  { id: 'evidence', label: 'What evidence compares hemiarthroplasty with total hip arthroplasty?', category: 'evidence' },
];
const result = filterReadNextCandidates({ candidates: adaptLegacyBranchesToReadNextCandidates(branches), context });
assert.deepEqual(result.accepted.map((item) => item.internalId), ['good']);
assert.deepEqual(result.rejected.map((item) => item.code), [
  'repeats_latest_request', 'already_answered', 'duplicate_near', 'evidence_unavailable',
]);

const urgent = filterReadNextCandidates({
  candidates: adaptLegacyBranchesToReadNextCandidates([{ id: 'quiz', label: 'Quiz me on open fractures', category: 'quiz' }]),
  context: { ...context, latestUserRequest: 'This is an open fracture emergency right now', urgent: true },
});
assert.equal(urgent.accepted.length, 0);
assert.equal(urgent.rejected[0]?.code, 'urgent_context_suppressed');

const stagedQuiz = filterReadNextCandidates({
  candidates: adaptLegacyBranchesToReadNextCandidates([
    { id: 'quiz', label: 'Continue with another quiz question', category: 'quiz' },
    { id: 'anatomy', label: 'Review the anatomy before continuing', category: 'anatomy' },
  ]),
  context: { ...context, stagedQuiz: true },
});
assert.equal(stagedQuiz.accepted.length, 0, 'Read Next is suppressed while a staged quiz awaits an answer');
assert.deepEqual(stagedQuiz.rejected.map((item) => item.code), ['interaction_incompatible', 'interaction_incompatible']);

const rankCandidates = adaptLegacyBranchesToReadNextCandidates([
  { id: 'anatomy', label: 'Which anatomy matters during femoral neck fracture treatment?', category: 'anatomy' },
  { id: 'decision', label: 'How does age change treatment decisions for femoral neck fractures?', category: 'decision' },
  { id: 'unrelated', label: 'What are the complications of rotator cuff repair?', category: 'complication' },
]);
const rankedOnce = rankReadNextCandidates({ candidates: rankCandidates, context });
const rankedTwice = rankReadNextCandidates({ candidates: [...rankCandidates].reverse(), context });
assert.deepEqual(rankedOnce.map((item) => item.internalId), rankedTwice.map((item) => item.internalId), 'ranking must be input-order independent');
assert.notEqual(rankedOnce[0]?.internalId, 'unrelated', 'latest-request relevance must outrank an unrelated candidate');

const duplicateCategoryCandidates = rankReadNextCandidates({
  candidates: adaptLegacyBranchesToReadNextCandidates([
    { id: 'd1', label: 'How does age guide fracture treatment?', category: 'decision' },
    { id: 'd2', label: 'How does displacement guide fracture treatment?', category: 'decision' },
    { id: 'd3', label: 'How does activity guide fracture treatment?', category: 'decision' },
    { id: 'a1', label: 'What anatomy affects the surgical approach?', category: 'anatomy' },
  ]), context,
});
const diverse = selectDiverseReadNextCandidates({ candidates: duplicateCategoryCandidates, max: 4 });
assert.ok(diverse.filter((item) => item.category === 'decision').length <= 2, 'selection caps each category');

const legacyCategoryCoverage = adaptLegacyBranchesToReadNextCandidates([
  { id: 'implant', label: 'How do I choose the right implants?', category: 'Implant Selection' },
  { id: 'approach', label: 'What surgical approach should I use?', category: 'Surgical Approach' },
  { id: 'exam', label: 'What history and exam findings matter?', category: 'assessment' },
  { id: 'red-flags', label: 'What red flags require urgent treatment?', category: 'assessment' },
  { id: 'study', label: 'How should I integrate practice questions?', category: 'Study Techniques' },
]);
assert.deepEqual(legacyCategoryCoverage.map((item) => item.category), [
  'decision', 'technique', 'clarify', 'complication', 'apply',
]);

const summary = evaluateReadNextShadow({ branches, context });
assert.equal(summary.inputCount, 5);
assert.equal(summary.acceptedCount, 1);
assert.equal(summary.selectedCount, 1);
assert.equal('latestUserRequest' in summary, false);
assert.equal('latestVisibleAnswer' in summary, false);
assert.equal(JSON.stringify(summary).includes('femoral'), false, 'shadow telemetry must contain no recommendation text');
assert.equal(JSON.stringify(summary).includes('rankScore'), false, 'shadow telemetry must contain no candidate scores');
assert.equal(JSON.stringify(summary).includes('internalId'), false, 'shadow telemetry must contain no candidate IDs');
assert.equal(isReadNextShadowEnabled({ BROBOT_READ_NEXT_V2_SHADOW: 'true' }), true);
assert.equal(isReadNextShadowEnabled({ BROBOT_READ_NEXT_V2_SHADOW: 'false' }), false);

console.log('Read Next shadow filter tests passed.');
