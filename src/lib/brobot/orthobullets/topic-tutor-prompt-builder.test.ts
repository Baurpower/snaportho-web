import assert from 'node:assert/strict';

import { buildTopicTutorMessages } from './topic-tutor-prompt-builder';
import type { ResolvedOrthobulletsContext } from './context-resolver';

const context: ResolvedOrthobulletsContext = {
  pageContext: {
    source: 'orthobullets',
    provider: 'orthobullets',
    mode: 'topic_page',
    pageUrl: 'https://www.orthobullets.com/pediatrics/4092/duchenne-muscular-dystrophy',
    pageKind: 'topic',
    topicId: '4092',
    title: 'Duchenne Muscular Dystrophy',
    breadcrumbs: ['Pediatrics'],
    sectionHeadings: ['Summary'],
    contentSections: [{ heading: 'Summary', text: 'X-linked dystrophin disorder.' }],
    answerChoices: [],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    extractionWarnings: [],
  },
  warnings: [],
  kgLookup: null,
};

const progress = {
  sectionsCompleted: [],
  conceptsMastered: [],
  conceptsMissed: [],
  savedPearls: [],
  tier: 1 as const,
};

const normalChat = buildTopicTutorMessages({
  context,
  progress,
  history: [],
  userMessage: 'Why does this cause cardiomyopathy?',
});
assert.match(normalChat[0]?.content ?? '', /treat the learner's message as normal chat/i);
assert.match(normalChat[0]?.content ?? '', /Answer it directly and conversationally/i);

const usefulVersion = buildTopicTutorMessages({ context, progress, history: [], action: 'explain_page' });
assert.match(usefulVersion[1]?.content ?? '', /3-5 ideas that organize the topic/i);
assert.match(usefulVersion[1]?.content ?? '', /helpful synthesis, not a quiz/i);

const tested = buildTopicTutorMessages({ context, progress, history: [], action: 'what_tested' });
assert.match(tested[1]?.content ?? '', /Give 3-5 concrete, prioritized OITE\/board testable takeaways/i);

const traps = buildTopicTutorMessages({ context, progress, history: [], action: 'board_traps' });
assert.match(traps[1]?.content ?? '', /tempting wrong idea with the clue or rule/i);

console.log('Orthobullets topic tutor focus and normal-chat tests passed.');
