import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerClaims, claimsForText } from './anki-claims.ts';
import { cardPreview, obviousConflict, safeCardLabel } from './anki-references.ts';

test('claim IDs follow rendered paragraphs, lists, and table cells', () => {
  const answer = '## Findings\nPosterior hip dislocation can injure the\nsciatic nerve. The urgent next step is reduction.\n\n- Assess sciatic nerve function before reduction.\n\n| Finding | Meaning |\n| --- | --- |\n| Foot drop | May indicate peroneal nerve injury |';
  const claims = answerClaims(answer);
  assert.deepEqual(claims.map((claim) => claim.id), ['1:0', '1:1', '2:0:0', '3:row:0:cell:1:0']);
  assert.match(claims[0].text, /dislocation can injure the sciatic nerve/);
  assert.equal(claimsForText('The sciatic nerve is at risk.', '0')[0].end, 29);
});

test('obvious contradictions and spoiler labels are rejected', () => {
  const card = 'The sciatic nerve is at risk in posterior hip dislocation.';
  assert.equal(obviousConflict('The sciatic nerve is not at risk in posterior hip dislocation.', card), true);
  assert.equal(obviousConflict('The left radial nerve is involved.', 'The right radial nerve is involved.'), true);
  assert.equal(obviousConflict('The angle is 90 degrees.', 'The angle is 75 degrees.'), true);
  assert.equal(obviousConflict('The sciatic nerve is at risk in posterior hip dislocation.', card), false);
  assert.equal(safeCardLabel('Deck::Knee::Meniscus {{c1::joint line tenderness}}'), 'Meniscus …');
  assert.equal(cardPreview('Most sensitive finding is {{c1::joint line tenderness}}.', 0, 'Deck::Knee'), 'Most sensitive finding is […].');
});
