import * as assert from 'node:assert/strict';

import { TOPIC_TUTOR_PRIMARY_ACTIONS } from './topic-tutor-chips.js';

assert.deepEqual(
  TOPIC_TUTOR_PRIMARY_ACTIONS.map(({ action }) => action),
  ['explain_page', 'quiz_me', 'what_tested', 'board_traps', 'attending_question']
);
assert.equal(TOPIC_TUTOR_PRIMARY_ACTIONS.length, 5);

console.log('Topic tutor focused action tests passed.');
