import * as assert from 'node:assert/strict';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import {
  appendHimalayaReviewBoard,
  getReviewBoardRows,
  summarizeBoard,
  type ReviewBoardRow,
  type ReviewBoardRowState,
} from './himalaya-review-board.js';
import { buildHimalayaOverviewContext } from '../providers/himalaya/himalaya-context.js';
import type { HimalayaApiQuestion } from '../providers/himalaya/himalaya-api.js';

function makeQuestion(overrides: Partial<HimalayaApiQuestion> & { questionAttemptId: number }): HimalayaApiQuestion {
  return {
    questionNumber: 1,
    type: 'MULTIPLE_CHOICE',
    stem: 'A synthetic stem.',
    choices: [],
    selectedChoiceIds: [],
    correctChoiceIds: [],
    isCorrect: null,
    explanation: null,
    references: null,
    keyReferencePoints: null,
    additionalFeedback: [],
    images: [],
    tags: [],
    averagePeerPercent: null,
    reviewAvailable: true,
    ...overrides,
  };
}

const questions: HimalayaApiQuestion[] = [
  makeQuestion({
    questionAttemptId: 101,
    questionNumber: 1,
    stem: 'Synthetic question one about a sanitized finding.',
    isCorrect: true,
    explanation: 'Synthetic discussion one.',
    choices: [
      { id: 'A', label: 'A', text: 'Synthetic A', selected: false, correct: false },
      { id: 'B', label: 'B', text: 'Synthetic B', selected: true, correct: true },
    ],
  }),
  makeQuestion({
    questionAttemptId: 102,
    questionNumber: 2,
    stem: 'Synthetic question two about a sanitized scenario.',
    isCorrect: false,
    explanation: 'Synthetic discussion two.',
    choices: [
      { id: 'A', label: 'A', text: 'Synthetic wrong pick', selected: true, correct: false },
      { id: 'B', label: 'B', text: 'Synthetic right answer', selected: false, correct: true },
    ],
  }),
  makeQuestion({
    questionAttemptId: 103,
    questionNumber: 3,
    stem: 'Synthetic question three, never answered.',
    isCorrect: null,
    reviewAvailable: false,
    choices: [{ id: 'A', label: 'A', text: 'Synthetic A', selected: false }],
  }),
];

const overview = buildHimalayaOverviewContext({
  bridgeState: {
    bridgeVersion: 'test',
    pageUrl: 'https://learn.aaos.org/diweb/?wicket:interface=:19::::',
    view: 'results',
    testAttemptId: 34631349,
    archived: true,
    assessmentTitle: 'Posttest: Synthetic Techniques',
    score: 1,
    maxScore: 3,
    questionResults: [],
    openModal: null,
    liveQuestion: null,
  },
  allQuestions: questions,
  pageUrl: 'https://learn.aaos.org/diweb/?wicket:interface=:19::::',
});

assert.equal(overview.pageKind, 'results-overview');
assert.equal(overview.provider, 'himalaya');
assert.equal(overview.questionCount, 3);
assert.equal(overview.raw?.providerSpecific?.missedCount, 1);
assert.equal(overview.raw?.providerSpecific?.attemptScore, 1);
assert.equal(overview.raw?.providerSpecific?.attemptMaxScore, 3);
assert.equal(
  overview.extractionWarnings.includes('himalaya_results_overview_no_active_question'),
  false,
  'a populated board is not an empty results page'
);

const rows = getReviewBoardRows(overview);
assert.equal(rows.length, 3, 'every question gets a board row');
assert.deepEqual(rows.map((row) => row.questionNumber), [1, 2, 3]);

const missedRow = rows.find((row) => row.questionAttemptId === 102) as ReviewBoardRow;
assert.equal(missedRow.isCorrect, false);
assert.equal(missedRow.selectedAnswer, 'A. Synthetic wrong pick');
assert.equal(missedRow.correctAnswer, 'B. Synthetic right answer');
assert.equal(missedRow.hasExplanation, true);

const unansweredRow = rows.find((row) => row.questionAttemptId === 103) as ReviewBoardRow;
assert.equal(unansweredRow.isCorrect, null, 'an unreviewed question stays neutral, not "missed"');
assert.equal(unansweredRow.correctAnswer, null, 'no answer key leaks for an unreviewed question');

const summary = summarizeBoard(rows);
assert.equal(summary.total, 3);
assert.equal(summary.missedCount, 1);
assert.equal(summary.correctCount, 1);
assert.deepEqual(summary.missedIds, [102], 'only genuine misses are auto-explained');

// Stem previews are capped so the board stays scannable.
const longStem = 'x'.repeat(400);
const longRows = getReviewBoardRows(
  buildHimalayaOverviewContext({
    bridgeState: null,
    allQuestions: [makeQuestion({ questionAttemptId: 200, stem: longStem })],
    pageUrl: 'https://learn.aaos.org/diweb/',
  })
);
assert.equal(longRows[0]?.stemPreview.length, 180);

// A results page BroBot could not load must not pretend to have a board.
const emptyOverview = buildHimalayaOverviewContext({
  bridgeState: null,
  allQuestions: [],
  pageUrl: 'https://learn.aaos.org/diweb/',
});
assert.deepEqual(getReviewBoardRows(emptyOverview), []);
assert.deepEqual(summarizeBoard([]).missedIds, []);
assert.equal(emptyOverview.classification?.pageKind, 'unreadable');
assert.ok(emptyOverview.extractionWarnings.includes('himalaya_results_overview_no_active_question'));

// Malformed provider payloads must not crash the panel.
assert.deepEqual(getReviewBoardRows(null), []);
assert.deepEqual(
  getReviewBoardRows({ raw: { providerSpecific: { reviewBoard: 'nope' } } } as never),
  []
);
assert.deepEqual(
  getReviewBoardRows({ raw: { providerSpecific: { reviewBoard: [null, {}, { questionAttemptId: 7 }] } } } as never).length,
  1
);

// Rendered output: a collapsed row must never spill the answer key, or the board
// would give away questions the learner has not asked to see yet.
const { document } = parseHTML('<html><body><div id="root"></div></body></html>');
(globalThis as { document?: unknown }).document = document;

const escapeHtml = (value: string) =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character
  );

const expandedMiss: ReviewBoardRowState = {
  expanded: true,
  loading: false,
  explanation: { bottomLine: 'Synthetic bottom line' } as never,
  error: null,
};

const root = document.getElementById('root') as HTMLElement;
appendHimalayaReviewBoard(root, {
  rows,
  rowStates: new Map([[102, expandedMiss]]),
  assessmentTitle: 'Posttest: Synthetic Techniques',
  score: 1,
  maxScore: 3,
  explainAllInFlight: false,
  hooks: {
    onToggleRow: () => {},
    onExplainRow: () => {},
    onExplainAllMisses: () => {},
    onUnlink: () => {},
  },
  renderers: {
    escapeHtml,
    renderExplanation: (explanation) => `<div class="expl">${escapeHtml(explanation.bottomLine)}</div>`,
  },
});

const renderedHtml = root.innerHTML;
assert.equal(root.querySelectorAll('[data-toggle-id]').length, 3, 'one toggle per question');
assert.equal(root.querySelector('#rb-explain-misses')?.textContent?.trim(), 'Walk my 1 miss');
assert.ok(renderedHtml.includes('1/3'), 'attempt score is shown');
assert.ok(renderedHtml.includes('1 missed of 3'), 'miss count is shown');
assert.equal(root.querySelectorAll('.expl').length, 1, 'only the expanded miss renders an explanation');
assert.equal(root.querySelector('[data-toggle-id="102"]')?.getAttribute('aria-expanded'), 'true');
assert.equal(root.querySelector('[data-toggle-id="101"]')?.getAttribute('aria-expanded'), 'false');

for (const collapsedId of [101, 103]) {
  const row = root.querySelector(`[data-toggle-id="${collapsedId}"]`)?.parentElement;
  assert.ok(
    !row?.textContent?.includes('Correct answer:'),
    `collapsed row ${collapsedId} must not reveal its answer key`
  );
}

// A clean sweep offers no bulk action and says so.
const cleanRoot = parseHTML('<html><body><div id="root"></div></body></html>').document.getElementById('root') as HTMLElement;
appendHimalayaReviewBoard(cleanRoot, {
  rows: rows.filter((row) => row.isCorrect === true),
  rowStates: new Map(),
  assessmentTitle: null,
  score: 1,
  maxScore: 1,
  explainAllInFlight: false,
  hooks: { onToggleRow: () => {}, onExplainRow: () => {}, onExplainAllMisses: () => {}, onUnlink: () => {} },
  renderers: { escapeHtml, renderExplanation: () => '' },
});
assert.equal(cleanRoot.querySelector('#rb-explain-misses'), null, 'no bulk action when nothing was missed');
assert.ok(cleanRoot.innerHTML.includes('Clean sweep'));

console.log('Himalaya review board tests passed.');
