import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import { getVisibleQuestionIdentity } from './question-lifecycle.js';

const fixtures = path.join(process.cwd(), 'extensions/orthobullets-brobot/fixtures');
const load = (name: string) => parseHTML(readFileSync(path.join(fixtures, name), 'utf8')).document;
const url = 'https://www.orthobullets.com/currenttest?testId=88&day=2';

const firstDocument = load('synthetic-current-test-select-answer-prompt.html');
const first = getVisibleQuestionIdentity(firstDocument, url);
assert.ok(first);
assert.equal(first.identity.testId, '88');
assert.equal(first.identity.day, '2');
assert.equal(first.identity.questionNumber, 3);

const selectedRow = firstDocument.querySelector('.answerItem');
selectedRow?.classList.add('selected');
const selectedOnly = getVisibleQuestionIdentity(firstDocument, url);
assert.equal(selectedOnly?.activeQuestionKey, first.activeQuestionKey, 'answer selection styling must not change question identity');

const modal = firstDocument.createElement('div');
modal.className = 'image-modal';
const modalImage = firstDocument.createElement('img');
modalImage.setAttribute('src', '/enlarged-answer-image.jpg');
modal.appendChild(modalImage);
firstDocument.querySelector('.question')?.appendChild(modal);
assert.equal(
  getVisibleQuestionIdentity(firstDocument, url)?.activeQuestionKey,
  first.activeQuestionKey,
  'image modal content must not change question identity'
);

const questionImage = firstDocument.createElement('img');
questionImage.setAttribute('src', '/new-question-image.jpg');
firstDocument.querySelector('.question')?.appendChild(questionImage);
assert.notEqual(
  getVisibleQuestionIdentity(firstDocument, url)?.activeQuestionKey,
  first.activeQuestionKey,
  'a visible question image must change question identity'
);

const nextDocument = load('synthetic-review-with-stale-prompt.html');
const next = getVisibleQuestionIdentity(nextDocument, url);
assert.ok(next);
assert.notEqual(next.activeQuestionKey, first.activeQuestionKey, 'new stem and answers must change question identity');

console.log('Question lifecycle identity tests passed.');
