import assert from 'node:assert/strict';

import { TopicTutorParseError, parseTopicTutorResponse } from './topic-tutor-response-parser';

const valid = JSON.stringify({
  message: 'Not quite — the page says nondisplaced femoral neck fractures in young patients get urgent fixation. What is the surgical urgency reason?',
  citedHeading: 'Treatment',
  citedQuote: 'Urgent reduction and fixation to minimize risk of avascular necrosis.',
  verdict: 'incorrect',
  clinicalWhyItMatters: 'Delays increase AVN risk in young patients with intact blood supply.',
  followUpQuestion: 'Why does timing matter more in young patients than elderly patients?',
  conceptTag: 'Femoral neck fracture urgency in young patients',
  conceptStatus: 'missed',
  sectionCompleted: null,
  tier: 3,
  insufficientContent: false,
  suggestedChips: ['Show board traps', 'What would an attending ask?'],
  warnings: [],
});

const parsed = parseTopicTutorResponse({
  raw: valid,
  responseId: '00000000-0000-4000-8000-000000000001',
  remainingToday: 4,
  dailyCap: 10,
  unlimited: false,
});

assert.equal(parsed.verdict, 'incorrect');
assert.equal(parsed.conceptStatus, 'missed');
assert.equal(parsed.tier, 3);
assert.equal(parsed.citedHeading, 'Treatment');
assert.ok(parsed.suggestedChips.length === 2);
assert.equal(parsed.usage?.remainingToday, 4);

assert.throws(() => {
  parseTopicTutorResponse({
    raw: 'not json at all',
    responseId: '00000000-0000-4000-8000-000000000002',
    remainingToday: null,
    dailyCap: null,
    unlimited: true,
  });
}, TopicTutorParseError);

console.log('topic-tutor-response-parser.test.ts passed');
