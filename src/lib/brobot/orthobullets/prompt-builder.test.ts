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

assert.match(system?.content ?? '', /Do NOT reveal the correct answer choice/i);
assert.match(system?.content ?? '', /Medical terms appearing inside choices may be discussed/i);
assert.match(system?.content ?? '', /Which choices describe a one-time threshold/i);
assert.match(system?.content ?? '', /learner must still perform a real reasoning step/i);
assert.match(user?.content ?? '', /Hint 1 - Recognize the pattern/);
assert.match(user?.content ?? '', /Yield strength/);
assert.doesNotMatch(user?.content ?? '', /User selected answer/);

const [levelTwoSystem, levelTwoUser] = buildOrthobulletsHintMessages({
  context,
  hintLevel: 2,
  priorHints: [{
    hintLevel: 1,
    title: 'Separate the material-property categories',
    hint: 'Sort the choices by the kind of behavior each property measures.',
  }],
  correctionIssues: ['Hint 2 does not explicitly contrast stronger and weaker paths'],
});

assert.match(levelTwoSystem?.content ?? '', /reduce five choices to roughly two/i);
assert.match(levelTwoSystem?.content ?? '', /CORRECTION REQUIRED/);
assert.match(levelTwoUser?.content ?? '', /Prior learner-visible hints/);
assert.match(levelTwoUser?.content ?? '', /Sort the choices by the kind of behavior/);

console.log('Orthobullets hint prompt anti-spoiler tests passed.');
