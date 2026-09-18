import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cardFields,
  renderCloze,
} from './anki-references.ts';

test('cloze rendering reveals only the selected deletion', () => {
  const text = 'A {{c1::posterior}} hip dislocation can injure the {{c2::sciatic nerve::nerve}}.';
  assert.equal(renderCloze(text, 1, false), 'A posterior hip dislocation can injure the [… nerve].');
  assert.equal(renderCloze(text, 1, true), 'A posterior hip dislocation can injure the sciatic nerve.');
});

test('card fields are stripped of active HTML before display', () => {
  const fields = cardFields([
    { name: 'Text', rawValue: '<div>Risk: {{c1::sciatic nerve}}</div><script>alert(1)</script>' },
    { name: 'Extra', rawValue: '<b>Check before reduction.</b>' },
  ]);
  assert.equal(fields.front.includes('<script>'), false);
  assert.equal(fields.extra, 'Check before reduction.');
});
