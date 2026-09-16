import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  answerSentences,
  cardFields,
  clozeFactMatches,
  renderCloze,
} from './anki-references.ts';

test('cloze rendering reveals only the selected deletion', () => {
  const text = 'A {{c1::posterior}} hip dislocation can injure the {{c2::sciatic nerve::nerve}}.';
  assert.equal(renderCloze(text, 1, false), 'A posterior hip dislocation can injure the [… nerve].');
  assert.equal(renderCloze(text, 1, true), 'A posterior hip dislocation can injure the sciatic nerve.');
});

test('fact matching rejects broad topical overlap', () => {
  const card = 'The {{c1::sciatic nerve}} is at risk in posterior hip dislocation.';
  assert.equal(clozeFactMatches('Posterior hip dislocation can injure the sciatic nerve.', card, 0), true);
  assert.equal(clozeFactMatches('Posterior hip dislocations require urgent reduction.', card, 0), false);
  assert.equal(clozeFactMatches('The sciatic nerve is at risk in a different condition.', card, 0), false);
  assert.equal(clozeFactMatches(
    'The sciatic nerve is the structure most at risk in a posterior hip dislocation.',
    'Which nerve is most commonly injured following a posterior hip dislocation? {{c1::Sciatic nerve}}',
    0,
  ), true);
});

test('card fields are stripped of active HTML before display', () => {
  const fields = cardFields([
    { name: 'Text', rawValue: '<div>Risk: {{c1::sciatic nerve}}</div><script>alert(1)</script>' },
    { name: 'Extra', rawValue: '<b>Check before reduction.</b>' },
  ]);
  assert.equal(fields.front.includes('<script>'), false);
  assert.equal(fields.extra, 'Check before reduction.');
  assert.deepEqual(answerSentences('## Heading\nPosterior hip dislocation can injure the sciatic nerve.'), [
    'Posterior hip dislocation can injure the sciatic nerve.',
  ]);
});
