import assert from 'node:assert/strict';

import { evaluateHistoricalReadNextRow, sanitizeReviewText } from './read-next-evaluation';

const evaluated = evaluateHistoricalReadNextRow({
  row: {
    auditId: 'C1:T1', conversationAuditId: 'C1', mode: 'general',
    userPrompt: 'How are displaced femoral neck fractures treated?',
    answer: 'Treatment depends on age, activity, displacement, and pre-existing arthritis.',
    nextLearningBranches: [
      { id: 'repeat', label: 'How are displaced femoral neck fractures treated?' },
      { id: 'decision', label: 'How does age affect arthroplasty selection?', category: 'decision' },
      { id: 'near', label: 'How does age affect selection of arthroplasty?', category: 'decision' },
    ],
  },
  history: [],
});
assert.ok(evaluated);
assert.equal(evaluated.result.originalCount, 3);
assert.equal(evaluated.result.selectedCount, 1);
assert.equal(evaluated.result.rejectionCounts.repeats_latest_request, 1);
assert.equal(evaluated.result.rejectionCounts.duplicate_near, 1);
assert.equal(evaluated.result.stableAcrossInputOrder, true);
assert.equal(evaluated.result.winner, 'v2');
assert.equal('userPrompt' in evaluated.result, false, 'machine-readable case results must omit raw prompts');
assert.equal(sanitizeReviewText('MRN: ABC12345 email x@y.com'), '[REDACTED_MRN] email [REDACTED_EMAIL]');
assert.ok(['current_is_a', 'v2_is_a'].includes(evaluated.review.assignmentKey));

console.log('Historical Read Next evaluator tests passed.');
