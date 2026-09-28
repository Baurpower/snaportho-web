import assert from 'node:assert/strict';
import { renderPageAnkiReview } from './page-anki-review-panel';
const html = renderPageAnkiReview({ provider: 'rock', pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=1', cards: [{ noteGuid: 'g', cardOrdinal: 0, prompt: '<prompt>', answer: 'answer', extra: 'pearl' }] }, 'ready', (value) => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
assert.match(html, /1 card for this page/);
assert.match(html, /&lt;prompt&gt;/);
assert.doesNotMatch(html, /<prompt>/);
assert.match(html, /Reveal answer/);
console.log('page Anki review panel tests passed');
