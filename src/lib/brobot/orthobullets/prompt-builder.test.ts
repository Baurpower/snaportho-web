import assert from 'node:assert/strict';

import { buildOrthobulletsHintMessages } from './prompt-builder';
import type { ResolvedOrthobulletsContext } from './context-resolver';

function textContent(message: ReturnType<typeof buildOrthobulletsHintMessages>[number] | undefined) {
  if (!message) return '';
  return typeof message.content === 'string'
    ? message.content
    : message.content
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
}

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
const systemText = textContent(system);
const userText = textContent(user);

assert.match(systemText, /Do NOT reveal the correct answer choice/i);
assert.match(systemText, /Medical terms appearing inside choices may be discussed/i);
assert.match(systemText, /Which choices describe a one-time threshold/i);
assert.match(systemText, /learner must still perform a real reasoning step/i);
assert.match(userText, /Hint 1 - Recognize the pattern/);
assert.match(userText, /Yield strength/);
assert.doesNotMatch(userText, /User selected answer/);

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

assert.match(textContent(levelTwoSystem), /reduce five choices to roughly two/i);
assert.match(textContent(levelTwoSystem), /CORRECTION REQUIRED/);
assert.match(textContent(levelTwoUser), /Prior learner-visible hints/);
assert.match(textContent(levelTwoUser), /Sort the choices by the kind of behavior/);

const [, visionUser] = buildOrthobulletsHintMessages({
  context: {
    ...context,
    pageContext: {
      ...context.pageContext,
      pageUrl: 'https://www.orthobullets.com/currenttest',
      stem: 'Which Angle A measurement increases junctional risk in Figure A?',
      images: [{ src: '/question-images/sagittal-alignment.png' }],
    },
  },
  hintLevel: 1,
});

assert.ok(Array.isArray(visionUser?.content), 'question figures should produce multimodal input');
assert.deepEqual(
  Array.isArray(visionUser?.content)
    ? visionUser.content.filter((part) => part.type === 'image_url').map((part) => part.image_url.url)
    : [],
  ['https://www.orthobullets.com/question-images/sagittal-alignment.png']
);
assert.match(textContent(visionUser), /Inspect labels and measurements directly/);

console.log('Orthobullets hint prompt anti-spoiler tests passed.');
