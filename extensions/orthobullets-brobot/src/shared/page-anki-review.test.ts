import assert from 'node:assert/strict';
import { readPageAnkiReview } from './page-anki-review';

const parsed = readPageAnkiReview({
  provider: 'rock',
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=6003020',
  cards: [{ noteGuid: 'safe-guid', cardOrdinal: 0, prompt: 'Prompt', answer: 'Answer', extra: null }],
});
assert.equal(parsed?.cards[0]?.prompt, 'Prompt');
assert.equal(readPageAnkiReview({ provider: 'rock', pageUrl: 'javascript:alert(1)', cards: [] }), null);
assert.deepEqual(readPageAnkiReview({
  provider: 'orthobullets', pageUrl: 'https://www.orthobullets.com/trauma/1/x',
  cards: [{ noteGuid: '<bad>', cardOrdinal: 0, prompt: 'x', answer: 'y' }],
})?.cards, []);

console.log('page Anki review tests passed');
