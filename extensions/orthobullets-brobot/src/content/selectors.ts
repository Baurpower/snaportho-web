/**
 * Selector definitions for the Orthobullets review-page DOM.
 *
 * Each field is a layered list of selectors, ordered from most to least
 * specific/stable. The extractor walks each list in order and uses the
 * first one that matches, recording which selector matched for debugging
 * (see `debug.matchedSelectors` on OrthobulletsPageContext).
 *
 * SELECTOR_SET_VERSION should be bumped whenever this file changes so the
 * selector health report (scripts/orthobullets-extraction-health-report.ts)
 * can correlate report runs with selector revisions independently of
 * EXTRACTOR_VERSION, which also covers parsing logic in extractor.ts.
 *
 * Selectors were captured against five real orthobullets.com review pages
 * (extensions/orthobullets-brobot/fixtures/ob-review-*.html) on 2026-06-29.
 * If Orthobullets changes their markup, re-capture fixtures (see README)
 * and update this file; the health report script will flag regressions.
 */
export const SELECTOR_SET_VERSION = '2026-06-29-testview-review-v2';

export const SELECTORS = {
  // Breadcrumb trail above the question (topic > section > subsection).
  // The trailing `--without-link` item is a "QID: 1234 (OBQ...)" label, not
  // a real breadcrumb, so it's explicitly excluded.
  breadcrumbs: [
    '.breadcrumbs-section--question .breadcrumbs-section__path-item:not(.breadcrumbs-section__path-item--without-link)',
    '.breadcrumbs-section__path-item:not(.breadcrumbs-section__path-item--without-link)',
    '.dashboard-item__breadcrumbs a',
    '.innerPageTitleWrapper + .breadcrumbs a',
    '.mainSection a[href*="/topic/"]',
    'nav.breadcrumb a',
    '[aria-label="breadcrumb"] a',
  ],

  // The question prompt/stem text. `.question__text` is unique to the stem
  // node — the explanation wrapper shares the `question-notes-section-text`
  // class but never `question__text` — so it doesn't collide with
  // SELECTORS.explanation below.
  stem: [
    '.question__text',
    '[id*="lblQuestionText"]',
    '[id*="litQuestionText"]',
    '.questionText',
    '.question-text',
    '.qbank-question__stem',
    '[data-testid="question-stem"]',
    '.question-stem',
  ],

  // Container for each answer choice row. `.type-wrong` is a hidden
  // placeholder row Orthobullets renders for layout/keyboard-shortcut
  // purposes and is not a real choice.
  choiceRows: [
    '.answers .answerItem:not(.type-wrong)',
    '.answerItem:not(.type-wrong)',
    '[id*="rptAnswers"] tr',
    '[id*="dlAnswers"] tr',
    '.answerRow',
    '.answer-row',
    '.answer',
    '[data-testid="answer-choice"]',
    '.answer-choice',
    '.question-answers li',
  ],

  // Text of an individual answer choice, scoped within a choiceRows node.
  choiceText: [
    '.answerDescription .answerText',
    '.answerText',
    '[id*="lblAnswerText"]',
    '.answer-description',
    '.answer-copy',
  ],

  // Per-choice percent-selected label, scoped within a choiceRows node.
  choicePercent: ['.preferred .percent', '.percent', '.answer-percent', '[id*="lblPercent"]'],

  // The "Preferred Response" / official explanation section. Orthobullets
  // renders the explanation in a second `question-notes-section-text*`
  // block whose id is suffixed `-prefered`.
  explanation: [
    '[id$="-prefered"] .text',
    '.preferredResponse .question-notes-section-text .text',
    '.preferredResponse__content .text',
    '[id*="lblPreferredResponse"]',
    '[id*="litPreferredResponse"]',
    '.preferred-response',
    '.answer-explanation',
    '[data-testid="question-explanation"]',
    '.question-explanation',
    '#explanation',
  ],

  // Static, non-AJAX-loaded links to related topics/OITE content. The
  // "Review Cards" count and modal are present in markup but the actual
  // card list loads via AJAX and is intentionally NOT captured here —
  // only the visible static buttons/links are read.
  linkedConcepts: [
    '.preferredResponse__tested-concept-button-wrapper a',
    '.summary-button--compare-oite',
    '.summary-button--bullet',
    '[data-testid="related-links"] a',
    '.related-topics a',
  ],

  // Question figure images. Orthobullets renders these as `div`s with a
  // CSS `background-image` rather than `<img>` tags, and stores the asset
  // URL in a non-standard `alt` attribute on the div. Only ever metadata
  // (URL string + dimensions) is read here — never pixel data or OCR.
  images: [
    '.question__images .question__image',
    '.question__image',
    '[id*="imgQuestion"]',
    '.questionImage img',
    '.question-image img',
    '.question-stem img',
    '.qbank-question img',
    '.review-explanation img',
    'figure img',
  ],

  // Class names on a choice row (or its hidden checkbox input) indicating
  // the user selected that choice.
  selectedAnswerClassNames: ['selected', 'user-selected'],

  // Class names on a choice row indicating it is the correct/preferred
  // answer. `right` only appears when the choice is also the one the user
  // selected, so this is supplemented by the section-level `data-correct`
  // attribute, which is reliable regardless of what the user picked.
  correctAnswerClassNames: ['right', 'correct', 'preferred-choice'],
  correctAnswerSection: '.preferredResponse[data-correct]',

  // Per-choice percent distribution rows, used as a fallback when percent
  // isn't embedded directly inside the choice row markup.
  distributionRows: [
    '[data-testid="answer-distribution"] [data-testid="distribution-row"]',
    '.answer-distribution .distribution-row',
    '.choice-distribution .distribution-row',
    '.preferredResponse .preferred',
    '[id*="rptPercent"] tr',
  ],

  // Question ID is most reliably read from `data-question-id` on the
  // question-notes-section wrapper, with the visible "QID 1234" text and
  // URL path as fallbacks.
  questionIdHints: [
    '[data-question-id]',
    '.question__code',
    '#ctl00_content_lblQuestionID',
    '.innerPageTitle',
    '[data-quiz-question-id]',
    '[data-question-code]',
  ],

  // Topic ID is parsed primarily from the canonical URL path
  // (`/specialty/<topicId>/slug`); these are a fallback for layouts that
  // expose it directly via a data attribute.
  topicIdHints: ['[data-topic-id]', '[data-topic-code]'],
} as const;
