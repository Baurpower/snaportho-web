import * as assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import {
  appendDeckLinkPanel,
  appendLinkedReviewPanel,
} from './anki-linking-panel.js';
import type {
  AnkiLinkCard,
  AnkiLinkedReviewCard,
  AnkiSourcePage,
} from '../shared/messages.js';

const page: AnkiSourcePage = {
  id: 'page-1',
  provider: 'orthobullets',
  canonical_url: 'https://orthobullets.com/trauma/123/topic',
  source_url: 'https://orthobullets.com/trauma/123/topic',
  title: 'Ankle topic',
};
const deckCard: AnkiLinkCard = {
  canonicalCardId: 'card-1',
  canonicalCardVersionId: 'version-1',
  noteGuid: 'note-1',
  cardOrdinal: 0,
  orderingKey: '0001',
  fields: [{ name: 'Front', text: 'Which approach?' }, { name: 'Back', text: 'Use the latest release answer.' }],
  linkedPageIds: [page.id],
};
const { document } = parseHTML('<div id="deck"></div><div id="review"></div>');
Object.defineProperty(globalThis, 'document', { value: document, configurable: true });
const deckRoot = document.querySelector('#deck') as HTMLElement;
const reviewRoot = document.querySelector('#review') as HTMLElement;
const selected: string[] = [];
const saved: string[] = [];
const deckMoves: number[] = [];
appendDeckLinkPanel(deckRoot, {
  card: deckCard,
  total: 4,
  offset: 1,
  releaseVersion: '2026.09',
  pages: [page],
  selectedPageId: page.id,
  linkedPages: [page],
  activeUrl: page.source_url,
  activeTitle: page.title,
  activeProvider: 'orthobullets',
  busy: false,
  error: null,
  hooks: {
    searchDeck: () => {},
    loadDeckCard: (offset) => deckMoves.push(offset),
    searchPages: () => {},
    registerPage: () => {},
    selectPage: (pageId) => selected.push(pageId),
    saveLink: (pageId) => saved.push(pageId),
    removeLink: (pageId) => selected.push(`remove:${pageId}`),
  },
});
assert.match(deckRoot.textContent ?? '', /Card 2 of 4/);
assert.match(deckRoot.textContent ?? '', /Which approach\?/);
assert.match(deckRoot.textContent ?? '', /Use the latest release answer\./);
assert.match(deckRoot.textContent ?? '', /https:\/\/orthobullets\.com\/trauma\/123\/topic/);
assert.equal(deckRoot.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), '50');
const deckButtons = Array.from(deckRoot.querySelectorAll('button'));
deckButtons.find((item) => item.textContent === 'Skip')?.click();
deckButtons.find((item) => item.textContent === 'Link card to selected page')?.click();
assert.deepEqual(deckMoves, [2]);
assert.deepEqual(saved, [page.id]);
assert.equal(deckRoot.querySelectorAll('button').length > 0, true);

const current: AnkiLinkedReviewCard = { ...deckCard, available: true };
const unavailable: AnkiLinkedReviewCard = { canonicalCardId: 'retired-card', available: false };
let movedTo = -1;
let revealed = false;
let removed = '';
appendLinkedReviewPanel(reviewRoot, {
  pages: [page],
  pageId: page.id,
  cards: [current, unavailable],
  cardIndex: 0,
  revealed: true,
  busy: false,
  error: null,
  hooks: {
    searchPages: () => {},
    selectPage: (pageId) => selected.push(pageId),
    moveCard: (index) => { movedTo = index; },
    toggleReveal: () => { revealed = !revealed; },
    removeUnavailableLink: (cardId) => { removed = cardId; },
  },
});
assert.match(reviewRoot.textContent ?? '', /Linked cards on this page \(2\)/);
assert.match(reviewRoot.textContent ?? '', /latest included version/);
assert.match(reviewRoot.textContent ?? '', /Use the latest release answer\./);
reviewRoot.querySelectorAll('button')[1]?.click();
assert.equal(movedTo, 0);
(reviewRoot.querySelector('button[title^="https://orthobullets"]') as HTMLButtonElement | null)?.click();
assert.deepEqual(selected, [page.id]);

const unavailableRoot = document.createElement('div');
appendLinkedReviewPanel(unavailableRoot, {
  pages: [page],
  pageId: page.id,
  cards: [unavailable],
  cardIndex: 0,
  revealed: false,
  busy: false,
  error: null,
  hooks: {
    searchPages: () => {},
    selectPage: () => {},
    moveCard: () => {},
    toggleReveal: () => {},
    removeUnavailableLink: (cardId) => { removed = cardId; },
  },
});
assert.match(unavailableRoot.textContent ?? '', /unavailable in the latest published deck/i);
(
  Array.from(unavailableRoot.querySelectorAll('button'))
    .find((item) => item.textContent === 'Remove unavailable link') as HTMLButtonElement | undefined
)?.click();
assert.equal(removed, 'retired-card');

console.log('Anki linking and page reviewer panel tests passed.');
