import assert from 'node:assert/strict';

import { buildOrthobulletsHintMessages } from './prompt-builder';
import type { ResolvedOrthobulletsContext } from './context-resolver';

const context: ResolvedOrthobulletsContext = {
  pageContext: {
    source: 'orthobullets',
    provider: 'orthobullets',
    mode: 'question',
    pageUrl: 'https://www.orthobullets.com/currenttest',
    pageKind: 'question',
    questionId: '2928',
    stem: 'Which defines the stress at which a material begins to undergo plastic deformation?',
    breadcrumbs: [],
    answerChoices: [
      { key: '1', text: 'Toughness' },
      { key: '2', text: 'Ultimate strength' },
      { key: '3', text: 'Yield strength' },
      { key: '4', text: 'Fatigue strength' },
      { key: '5', text: 'Endurance limit' },
    ],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    extractionWarnings: [],
  },
  warnings: [],
  kgLookup: null,
};

const [system, user] = buildOrthobulletsHintMessages({ context, hintLevel: 1 });

assert.match(system?.content ?? '', /title must be generic/i);
assert.match(system?.content ?? '', /Do NOT repeat any answer choice verbatim/i);
assert.match(system?.content ?? '', /unmistakable synonym/i);
assert.match(system?.content ?? '', /Which choices describe a one-time threshold/i);
assert.match(system?.content ?? '', /learner must still perform a real reasoning step/i);
assert.match(user?.content ?? '', /Hint 1 - Recognize the pattern/);
assert.match(user?.content ?? '', /Yield strength/);

console.log('Orthobullets hint prompt anti-spoiler tests passed.');
