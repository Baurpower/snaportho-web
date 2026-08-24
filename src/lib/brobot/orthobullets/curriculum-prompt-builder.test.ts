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
    images: [{ src: 'https://rock.aaos.org/figure-4.jpg', alt: 'AP pelvis radiograph', caption: 'Contained central acetabular deficiency (Paprosky type IIA).' }],
    extractionWarnings: [],
    learningObjectives: ['Recognize LAST'],
  },
  warnings: [],
  kgLookup: null,
};

const highYield = buildCurriculumExplainMessages({ context, emphasis: 'high_yield' });
const boards = buildCurriculumExplainMessages({ context, emphasis: 'boards' });

assert.match(highYield[1]?.content ?? '', /COMPLETE STUDY GUIDE/i);
assert.match(boards[1]?.content ?? '', /COMPLETE STUDY GUIDE/i);
assert.match(highYield[1]?.content ?? '', /Recognize LAST/);
assert.match(highYield[1]?.content ?? '', /Paprosky type IIA/);
assert.match(highYield[0]?.content ?? '', /suggestedFollowUps/);
assert.match(highYield[0]?.content ?? '', /actual named type\/grade/i);
assert.match(highYield[0]?.content ?? '', /Do not merely state that a classification exists/i);
assert.match(highYield[0]?.content ?? '', /standalone study guide/i);
assert.match(highYield[0]?.content ?? '', /8-16 board-grade facts/i);
assert.match(highYield[1]?.content ?? '', /board testing, clinical decisions, and OR relevance/i);

console.log('Curriculum prompt builder emphasis tests passed.');
