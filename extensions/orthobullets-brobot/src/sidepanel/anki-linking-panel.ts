import type {
  AnkiLinkCard,
  AnkiLinkedReviewCard,
  AnkiSourcePage,
} from '../shared/messages.js';

const colors = {
  ink: '#18202b',
  muted: '#5c6574',
  border: '#ded7c8',
  teal: '#0f766e',
};

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
}

function button(label: string, onClick: () => void, disabled = false) {
  const element = node('button', label);
  element.type = 'button';
  element.disabled = disabled;
  Object.assign(element.style, {
    border: `1px solid ${colors.border}`,
    borderRadius: '999px',
    background: disabled ? '#f1f0ec' : 'white',
    color: colors.ink,
    padding: '8px 12px',
    fontWeight: '700',
    cursor: disabled ? 'default' : 'pointer',
  });
  element.addEventListener('click', onClick);
  return element;
}

function card(title: string) {
  const section = node('section');
  Object.assign(section.style, {
    padding: '14px',
    borderRadius: '14px',
    background: 'white',
    border: `1px solid ${colors.border}`,
    display: 'grid',
    gap: '10px',
  });
  const heading = node('h2', title);
  Object.assign(heading.style, { margin: '0', fontSize: '16px' });
  section.append(heading);
  return section;
}

function makeInput(placeholder: string, initial = '') {
  const element = node('input');
  element.type = 'search';
  element.placeholder = placeholder;
  element.value = initial;
  Object.assign(element.style, {
    width: '100%',
    border: `1px solid ${colors.border}`,
    borderRadius: '9px',
    background: 'white',
    color: colors.ink,
    padding: '9px 10px',
  });
  return element;
}

function text(value: string, muted = false) {
  const element = node('p', value);
  Object.assign(element.style, {
    margin: '0',
    color: muted ? colors.muted : colors.ink,
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  });
  return element;
}

function pageLabel(page: AnkiSourcePage) {
  return `${page.provider === 'rock' ? 'ROCK' : 'Orthobullets'} · ${page.title}`;
}

function pageButtonLabel(page: AnkiSourcePage, selected: boolean, onClick: () => void, disabled = false) {
  const element = button(`${selected ? '✓ ' : ''}${pageLabel(page)}\n${page.canonical_url}`, onClick, disabled);
  element.title = page.canonical_url;
  Object.assign(element.style, { whiteSpace: 'pre-wrap', textAlign: 'left' });
  return element;
}

export type AnkiLinkingPanelHooks = {
  searchDeck: (query: string) => void;
  loadDeckCard: (offset: number) => void;
  searchPages: (query: string) => void;
  registerPage: (provider: 'orthobullets' | 'rock', url: string, title: string) => void;
  selectPage: (pageId: string) => void;
  saveLink: (pageId: string) => void;
  removeLink: (pageId: string) => void;
};

export function appendDeckLinkPanel(
  root: HTMLElement,
  input: {
    card: AnkiLinkCard | null;
    total: number;
    offset: number;
    releaseVersion: string | null;
    pages: AnkiSourcePage[];
    selectedPageId: string | null;
    linkedPages: AnkiSourcePage[];
    activeUrl: string | null;
    activeTitle: string | null;
    activeProvider: 'orthobullets' | 'rock' | null;
    busy: boolean;
    error: string | null;
    hooks: AnkiLinkingPanelHooks;
  },
) {
  const wrapper = node('div');
  Object.assign(wrapper.style, { display: 'grid', gap: '12px' });
  const progress = card('Link the current published deck');
  progress.append(
    text(input.releaseVersion ? `Deck version ${input.releaseVersion}` : 'Loading published deck…', true),
    text(input.card && input.total
      ? `Card ${input.offset + 1} of ${input.total}${input.card.linkedPageIds?.length ? ` · ${input.card.linkedPageIds.length} linked page(s)` : ''}`
      : 'Search the published deck or move through cards in order.', true),
  );
  const progressTrack = node('div');
  const progressPercent = input.total ? Math.round(((input.offset + 1) / input.total) * 100) : 0;
  progressTrack.setAttribute('role', 'progressbar');
  progressTrack.setAttribute('aria-label', 'Deck linking progress');
  progressTrack.setAttribute('aria-valuemin', '0');
  progressTrack.setAttribute('aria-valuemax', '100');
  progressTrack.setAttribute('aria-valuenow', String(progressPercent));
  Object.assign(progressTrack.style, {
    height: '7px',
    borderRadius: '999px',
    background: '#e8e4d9',
    overflow: 'hidden',
  });
  const progressFill = node('div');
  Object.assign(progressFill.style, {
    width: `${progressPercent}%`,
    height: '100%',
    borderRadius: 'inherit',
    background: colors.teal,
    transition: 'width 150ms ease',
  });
  progressTrack.append(progressFill);
  progress.append(progressTrack);
  const deckSearch = makeInput('Search cards by front or back text');
  const searchDeck = button('Search deck', () => input.hooks.searchDeck(deckSearch.value), input.busy);
  progress.append(deckSearch, searchDeck);
  if (input.card) {
    const fieldByName = new Map(input.card.fields.map((field) => [field.name.toLocaleLowerCase(), field.text]));
    const front = fieldByName.get('front') ?? fieldByName.get('text') ?? '';
    const back = fieldByName.get('back') ?? fieldByName.get('extra') ?? '';
    progress.append(
      text(front || 'Front field unavailable in this release.'),
      text(back || 'Back field unavailable in this release.', true),
    );
  }
  const navigation = node('div');
  Object.assign(navigation.style, { display: 'flex', gap: '8px', flexWrap: 'wrap' });
  navigation.append(
    button('Previous', () => input.hooks.loadDeckCard(input.offset - 1), input.busy || input.offset <= 0),
    button('Skip', () => input.hooks.loadDeckCard(input.offset + 1), input.busy || input.offset + 1 >= input.total),
    button('Next', () => input.hooks.loadDeckCard(input.offset + 1), input.busy || input.offset + 1 >= input.total),
  );
  progress.append(navigation);
  if (input.error) progress.append(text(input.error));
  wrapper.append(progress);

  const sourcePages = card('Choose or register a source page');
  const pageSearch = makeInput('Search pages you have registered');
  pageSearch.addEventListener('change', () => input.hooks.searchPages(pageSearch.value));
  sourcePages.append(pageSearch);
  const list = node('div');
  Object.assign(list.style, { display: 'grid', gap: '6px' });
  for (const page of input.pages) {
    const select = pageButtonLabel(
      page,
      input.selectedPageId === page.id,
      () => input.hooks.selectPage(page.id),
    );
    select.style.justifySelf = 'start';
    list.append(select);
  }
  if (!input.pages.length) list.append(text('No matching saved pages yet. Open a source page or enter its URL below.', true));
  sourcePages.append(list);

  const pageUrl = makeInput('Orthobullets or ROCK page URL', input.activeUrl ?? '');
  pageUrl.type = 'url';
  const pageTitle = makeInput('Page title', input.activeTitle ?? '');
  const provider = node('select');
  for (const [value, label] of [['orthobullets', 'Orthobullets'], ['rock', 'ROCK']]) {
    const option = node('option', label);
    option.value = value;
    option.selected = value === (input.activeProvider ?? 'orthobullets');
    provider.append(option);
  }
  Object.assign(provider.style, { padding: '8px', border: `1px solid ${colors.border}`, borderRadius: '9px' });
  sourcePages.append(provider, pageUrl, pageTitle, button('Save source page', () => {
    if (provider.value === 'orthobullets' || provider.value === 'rock') {
      input.hooks.registerPage(provider.value, pageUrl.value, pageTitle.value);
    }
  }, input.busy));
  sourcePages.append(button('Link card to selected page', () => {
    if (input.selectedPageId) input.hooks.saveLink(input.selectedPageId);
  }, input.busy || !input.card || !input.selectedPageId));

  const attached = card('Pages linked to this card');
  if (!input.linkedPages.length) attached.append(text('No page links on this card yet.', true));
  for (const page of input.linkedPages) {
    const row = node('div');
    Object.assign(row.style, { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' });
    row.append(text(pageLabel(page)), button('Remove', () => input.hooks.removeLink(page.id), input.busy));
    attached.append(row);
  }
  wrapper.append(sourcePages, attached);
  root.append(wrapper);
}

export type AnkiReviewPanelHooks = {
  searchPages: (query: string) => void;
  selectPage: (pageId: string) => void;
  moveCard: (index: number) => void;
  toggleReveal: () => void;
  removeUnavailableLink: (canonicalCardId: string) => void;
};

export function appendLinkedReviewPanel(
  root: HTMLElement,
  input: {
    pages: AnkiSourcePage[];
    pageId: string | null;
    cards: AnkiLinkedReviewCard[];
    cardIndex: number;
    revealed: boolean;
    busy: boolean;
    error: string | null;
    hooks: AnkiReviewPanelHooks;
  },
) {
  const wrapper = node('div');
  Object.assign(wrapper.style, { display: 'grid', gap: '12px' });
  const pages = card('Review cards linked to a page');
  const pageSearch = makeInput('Search saved Orthobullets / ROCK pages');
  pageSearch.addEventListener('change', () => input.hooks.searchPages(pageSearch.value));
  pages.append(pageSearch);
  for (const page of input.pages) {
    pages.append(pageButtonLabel(
      page,
      input.pageId === page.id,
      () => input.hooks.selectPage(page.id),
      input.busy,
    ));
  }
  if (!input.pages.length) pages.append(text('No source pages saved yet. Register one in Link deck.', true));
  wrapper.append(pages);

    const linkedList = card(`Linked cards on this page (${input.cards.length})`);
    if (!input.cards.length) linkedList.append(text('No linked cards are available for this page.', true));
    input.cards.forEach((linkedCard, index) => {
      const label = linkedCard.available
        ? linkedCard.fields.find((field) => ['front', 'text'].includes(field.name.toLocaleLowerCase()))?.text
          || 'Front unavailable in this release.'
        : `Unavailable card · ${linkedCard.canonicalCardId}`;
      const summary = label.replace(/\s+/g, ' ').slice(0, 140);
      linkedList.append(button(`${index === input.cardIndex ? '▶ ' : ''}${index + 1}. ${summary}`, () => {
        input.hooks.moveCard(index);
      }, input.busy));
    });
    wrapper.append(linkedList);

    const current = input.cards[input.cardIndex];
  const review = card('Linked-card reviewer');
  if (!current) {
    review.append(text(input.pageId ? 'This page has no linked cards.' : 'Select a source page to load its linked cards.', true));
  } else if (!current.available) {
    review.append(text('This linked card is unavailable in the latest published deck. Its stable card ID is retained; revisit it in Link deck to choose a current card.', true));
    review.append(button('Remove unavailable link', () => input.hooks.removeUnavailableLink(current.canonicalCardId), input.busy));
  } else {
    review.append(text(`Card ${input.cardIndex + 1} of ${input.cards.length} · latest included version`), text(current.canonicalCardId, true));
    if (input.revealed) {
      const fieldByName = new Map(current.fields.map((field) => [field.name.toLocaleLowerCase(), field.text]));
      review.append(
        text(`Front\n${fieldByName.get('front') ?? fieldByName.get('text') ?? 'Front unavailable in this release.'}`),
        text(`Back\n${fieldByName.get('back') ?? fieldByName.get('extra') ?? 'Back unavailable in this release.'}`),
      );
    } else {
      review.append(text(current.fields.find((field) => ['front', 'text'].includes(field.name.toLocaleLowerCase()))?.text ?? 'Front unavailable in this release.'));
    }
    review.append(button(input.revealed ? 'Hide back' : 'Reveal back', input.hooks.toggleReveal, input.busy));
  }
  const controls = node('div');
  Object.assign(controls.style, { display: 'flex', gap: '8px' });
  controls.append(
    button('Previous', () => input.hooks.moveCard(input.cardIndex - 1), input.busy || input.cardIndex <= 0),
    button('Next', () => input.hooks.moveCard(input.cardIndex + 1), input.busy || input.cardIndex + 1 >= input.cards.length),
  );
  review.append(controls);
  if (input.error) review.append(text(input.error));
  wrapper.append(review);
  root.append(wrapper);
}
