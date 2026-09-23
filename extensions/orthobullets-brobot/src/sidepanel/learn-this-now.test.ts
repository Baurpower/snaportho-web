import * as assert from 'node:assert/strict';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import {
  bindLearnThisNow,
  learnThisNowModel,
  queueAnkiLaunch,
  readLearnIdentity,
  recordLearnerFeedback,
  renderLearnThisNow,
} from './learn-this-now.js';

const miss = {
  identityStatus: 'stable',
  reviewState: 'answered_review',
  correct: false,
  nativeQuestionId: 'OBQ24-001',
};
const cards = [
  { noteGuid: 'note-primary', cardOrdinal: 0, rank: 1 as const },
  { noteGuid: 'note-support', cardOrdinal: 0, rank: 2 as const },
];

assert.equal(learnThisNowModel({ ...miss, correct: true }, null).visible, false);
assert.equal(learnThisNowModel(null, null, false).visible, false);

const unstable = learnThisNowModel({ ...miss, identityStatus: 'attempt_id_only', nativeQuestionId: null }, null);
assert.equal(unstable.visible && unstable.kind === 'empty', true);

const held = learnThisNowModel(miss, { disposition: 'abstain', reasonCodes: ['safety_hold'], cards: [] });
assert.equal(held.visible && held.kind === 'empty' && held.message.includes('held for review'), true);

const empty = learnThisNowModel(miss, { disposition: 'no_card', cards: [] });
assert.equal(empty.visible && empty.kind === 'empty' && empty.message.includes('No SnapOrtho card'), true);

const model = learnThisNowModel(miss, { disposition: 'served', cards });
assert.equal(model.visible && model.kind === 'cards' && model.cards.length === 2, true);

const { document } = parseHTML('<div id="root"></div>');
const root = document.querySelector('#root');
const html = renderLearnThisNow(model, (value) => value);
root.innerHTML = html;
const opened: Array<{ noteGuid: string; cardOrdinal: number }> = [];
const feedback: string[] = [];
bindLearnThisNow(root, {
  onOpenAnkiCard: (command) => opened.push(command),
  onLearnerFeedback: (event) => feedback.push(event.signal),
}, { cards });
root.querySelector('[data-rank="1"]').click();
root.querySelector('[data-learn-feedback="not_helpful"]').click();
assert.deepEqual(opened, [{ noteGuid: 'note-primary', cardOrdinal: 0, rank: 1 }]);
assert.deepEqual(feedback, ['not_helpful']);
assert.equal(recordLearnerFeedback({ cards }, 'not_helpful').affectsMatch, false);
assert.equal(recordLearnerFeedback({ cards }, 'not_helpful').cards.length, 2);
assert.equal(html.includes('note-primary') && !html.includes('deck'), true);

assert.equal(queueAnkiLaunch({ noteGuid: 'note-primary', cardOrdinal: 0, rank: 1, deckName: 'SnapOrtho' }).ok, false);
assert.equal(readLearnIdentity({ identityStatus: 'stable', stem: 'hidden' }), null);

console.log('learn-this-now.test.ts: passed');
