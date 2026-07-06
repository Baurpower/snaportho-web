import assert from 'node:assert/strict';

import { buildCurriculumExplainMessages } from './curriculum-prompt-builder';
import type { ResolvedOrthobulletsContext } from './context-resolver';

const context: ResolvedOrthobulletsContext = {
  pageContext: {
    source: 'rock',
    provider: 'rock',
    mode: 'curriculum_content',
    pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=6002116',
    pageKind: 'curriculum_content',
    title: 'Local Anesthesia',
    breadcrumbs: ['General Principles'],
    contentText: 'Local anesthetic pharmacology content.',
    answerChoices: [],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    extractionWarnings: [],
    learningObjectives: ['Recognize LAST'],
  },
  warnings: [],
  kgLookup: null,
};

const highYield = buildCurriculumExplainMessages({ context, emphasis: 'high_yield' });
const boards = buildCurriculumExplainMessages({ context, emphasis: 'boards' });

assert.match(highYield[1]?.content ?? '', /HIGH YIELD/i);
assert.match(boards[1]?.content ?? '', /BOARDS/i);
assert.match(highYield[1]?.content ?? '', /Recognize LAST/);
assert.match(highYield[0]?.content ?? '', /suggestedFollowUps/);
assert.notEqual(highYield[1]?.content, boards[1]?.content);

console.log('Curriculum prompt builder emphasis tests passed.');