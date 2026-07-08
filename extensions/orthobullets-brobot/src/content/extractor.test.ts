import * as assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import {
  detectQuestionProvider,
  extractOrthobulletsPageContext,
  extractOrthobulletsTopicPageContext,
  extractQuestionContext,
  isLikelyOrthobulletsTopicUrl,
} from './extractor.js';

const FIXTURES_DIR = path.join(process.cwd(), 'extensions/orthobullets-brobot/fixtures');

// Real `ob-review-*.html` captures are deliberately NOT committed to the
// repo (manually captured, gitignored — see README "Privacy / IP
// constraints"). They may or may not exist on a given machine, so every
// real-fixture case is skipped (not failed) when its file is absent. Run
// `npm run extension:orthobullets:test` on a machine with fixtures captured
// locally to get full real-fixture coverage.
function loadFixtureDocument(filename: string) {
  const html = readFileSync(path.join(FIXTURES_DIR, filename), 'utf8');
  const { document } = parseHTML(html);
  return document;
}

// --- Real Orthobullets review-page fixtures -------------------------------
// Captured manually on 2026-06-29 from live orthobullets.com review pages.
// These are the source of truth for extractor validation; the synthetic
// fixture below is retained only as a minimal sanity check / missing-field
// regression test, not as primary coverage.

type RealFixtureCase = {
  file: string;
  pageUrl: string;
  description: string;
  expectedQuestionId: string;
  expectedTopicId?: string;
  expectStem: boolean;
  expectExplanation: boolean;
  expectPercentDistribution: boolean;
  expectImages: boolean;
  expectPageKind?: 'review' | 'current_test' | 'unknown';
  allowMissingCorrectAnswer?: boolean;
  allowMissingSelectedAnswer?: boolean;
};

const REAL_FIXTURES: RealFixtureCase[] = [
  {
    file: 'ob-review-q1096.html',
    pageUrl: 'https://www.orthobullets.com/question/1096',
    description: 'image-heavy question with full percent distribution',
    expectedQuestionId: '1096',
    expectStem: true,
    expectExplanation: true,
    expectPercentDistribution: true,
    expectImages: true,
  },
  {
    file: 'ob-review-q2975.html',
    pageUrl: 'https://www.orthobullets.com/question/2975',
    description: 'text-only question, no images',
    expectedQuestionId: '2975',
    expectStem: true,
    expectExplanation: true,
    expectPercentDistribution: true,
    expectImages: false,
  },
  {
    file: 'ob-review-q5739.html',
    pageUrl: 'https://www.orthobullets.com/question/5739',
    description: 'OITE-style question with linked topic/cards',
    expectedQuestionId: '5739',
    expectStem: true,
    expectExplanation: true,
    expectPercentDistribution: true,
    expectImages: true,
  },
  {
    file: 'ob-review-q5923.html',
    pageUrl: 'https://www.orthobullets.com/question/5923',
    description: 'question with topic breadcrumb hierarchy and percent distribution',
    expectedQuestionId: '5923',
    expectStem: true,
    expectExplanation: true,
    expectPercentDistribution: true,
    expectImages: true,
  },
  {
    file: 'ob-review-q210138.html',
    pageUrl: 'https://www.orthobullets.com/question/210138',
    description: 'multi-image question with percent distribution',
    expectedQuestionId: '210138',
    expectStem: true,
    expectExplanation: true,
    expectPercentDistribution: true,
    expectImages: true,
  },
  {
    file: 'ob-review-q3794.html',
    pageUrl: 'https://www.orthobullets.com/testview?qid=3794&ans=2',
    description: 'legacy testview review shell for q3794 (may show premium wall when fetched without session)',
    expectedQuestionId: '3794',
    expectStem: false,
    expectExplanation: false,
    expectPercentDistribution: false,
    expectImages: false,
    expectPageKind: 'review',
    allowMissingCorrectAnswer: true,
    allowMissingSelectedAnswer: true,
  },
  {
    file: 'ob-currenttest-unanswered.html',
    pageUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
    description: 'unanswered current-test question without preferred response visible yet',
    expectedQuestionId: '210999',
    expectStem: true,
    expectExplanation: false,
    expectPercentDistribution: false,
    expectImages: true,
    expectPageKind: 'current_test',
    allowMissingCorrectAnswer: true,
    allowMissingSelectedAnswer: true,
  },
];

let skippedRealFixtures = 0;

for (const fixture of REAL_FIXTURES) {
  if (!existsSync(path.join(FIXTURES_DIR, fixture.file))) {
    skippedRealFixtures += 1;
    console.log(`SKIP [${fixture.file}] not present locally (real fixtures are gitignored, manual-capture-only).`);
    continue;
  }

  const document = loadFixtureDocument(fixture.file);
  const context = extractOrthobulletsPageContext({ document, pageUrl: fixture.pageUrl });

  // Question ID: must resolve, either from a stable selector or a
  // documented fallback. A missing question ID should never silently pass.
  assert.equal(
    context.questionId,
    fixture.expectedQuestionId,
    `[${fixture.file}] expected questionId ${fixture.expectedQuestionId}, got ${context.questionId} (${fixture.description})`
  );

  const isPremiumWallFixture = /Question locked|PEAK Premium Subscribers only/i.test(
    readFileSync(path.join(FIXTURES_DIR, fixture.file), 'utf8')
  );

  // Topic/breadcrumb hierarchy.
  if (!isPremiumWallFixture) {
    assert.ok(
      context.breadcrumbs.length > 0,
      `[${fixture.file}] expected non-empty breadcrumb trail (${fixture.description})`
    );
  }
  if (fixture.expectPageKind) {
    assert.equal(context.pageKind, fixture.expectPageKind, `[${fixture.file}] expected pageKind ${fixture.expectPageKind}`);
  }

  // Stem.
  if (fixture.expectStem) {
    assert.ok(context.stem && context.stem.length > 10, `[${fixture.file}] expected a non-trivial question stem`);
    assert.ok(!context.extractionWarnings.includes('Question stem not found.'), `[${fixture.file}] unexpected stem warning`);
  }

  // Answer choices + selected/correct answer.
  if (isPremiumWallFixture) {
    assert.equal(context.answerChoices.length, 0, `[${fixture.file}] premium-wall fixture should not expose answer choices`);
    assert.ok(
      context.extractionWarnings.includes('answer_choices_not_visible'),
      `[${fixture.file}] expected answer_choices_not_visible warning for premium-wall shell`
    );
  } else {
    assert.ok(context.answerChoices.length >= 2, `[${fixture.file}] expected at least 2 answer choices`);
  }
  if (fixture.allowMissingCorrectAnswer) {
    assert.equal(
      context.correctAnswerKey,
      undefined,
      `[${fixture.file}] expected correctAnswerKey to remain undefined until review mode`
    );
    assert.ok(
      context.extractionWarnings.includes('correct_answer_not_visible'),
      `[${fixture.file}] expected correct_answer_not_visible warning`
    );
  } else if (!isPremiumWallFixture) {
    assert.ok(context.correctAnswerKey, `[${fixture.file}] expected a resolved correct answer key`);
  }
  if (fixture.allowMissingSelectedAnswer) {
    assert.equal(
      context.selectedAnswerKey,
      undefined,
      `[${fixture.file}] expected selectedAnswerKey to remain undefined before answering`
    );
  } else if (!isPremiumWallFixture) {
    assert.ok(context.selectedAnswerKey, `[${fixture.file}] expected a resolved selected answer key (review pages are always answered)`);
  }
  if (!isPremiumWallFixture) {
    assert.ok(
      context.answerChoices.every((choice) => choice.text.length > 0),
      `[${fixture.file}] every answer choice must have non-empty text`
    );
  }

  // Explanation.
  if (fixture.expectExplanation) {
    assert.ok(
      context.explanationText && context.explanationText.length > 20,
      `[${fixture.file}] expected a non-trivial explanation`
    );
  } else {
    assert.equal(context.explanationText, undefined, `[${fixture.file}] explanation should be absent`);
    assert.ok(
      context.extractionWarnings.includes('preferred_response_not_visible'),
      `[${fixture.file}] expected preferred_response_not_visible warning`
    );
    assert.ok(
      context.extractionWarnings.includes('explanation_not_visible'),
      `[${fixture.file}] expected explanation_not_visible warning`
    );
  }

  // Percent distribution.
  if (fixture.expectPercentDistribution) {
    assert.ok(
      context.percentDistribution.length > 0,
      `[${fixture.file}] expected percent distribution rows`
    );
    assert.ok(
      context.percentDistribution.every((row) => typeof row.percent === 'number'),
      `[${fixture.file}] every distribution row must have a numeric percent`
    );
  }

  // Images: metadata only — never alt text that is itself an OCR/scrape of
  // image contents, and never inline/binary image data.
  if (fixture.expectImages) {
    assert.ok(context.images.length > 0, `[${fixture.file}] expected at least one image`);
  }
  context.images.forEach((image) => {
    assert.ok(image.src && /^https?:\/\//.test(image.src), `[${fixture.file}] image src must be an absolute URL, not inline data`);
    assert.ok(!image.src.startsWith('data:'), `[${fixture.file}] image src must never be inline/binary data`);
  });

  // Linked concepts (cards/OITE/topic references) — optional, but if present
  // must have a label.
  context.linkedConcepts.forEach((concept) => {
    assert.ok(concept.label.length > 0, `[${fixture.file}] linked concept must have a label`);
  });

  // Missing optional fields must always produce a warning, never a thrown
  // error or a silently-empty required field.
  assert.ok(Array.isArray(context.extractionWarnings), `[${fixture.file}] extractionWarnings must always be an array`);

  // Debug metadata for the selector health report.
  assert.ok(context.debug?.extractorVersion, `[${fixture.file}] debug.extractorVersion must be set`);
  if (!isPremiumWallFixture) {
    assert.ok(Object.keys(context.debug?.matchedSelectors ?? {}).length > 0, `[${fixture.file}] expected at least one matched selector`);
  }
}

// --- Synthetic fixture: minimal sanity + missing-field regression check --

function createNode(text: string, attrs: Record<string, string> = {}) {
  return {
    textContent: text,
    getAttribute(name: string) {
      return attrs[name] ?? null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createSyntheticDocument() {
  const html = readFileSync(path.join(FIXTURES_DIR, 'synthetic-review-page.html'), 'utf8');
  assert.match(html, /Synthetic Orthobullets Review Fixture/);

  const breadcrumb1 = createNode('Trauma');
  const breadcrumb2 = createNode('Tibial Plateau Fractures');
  const stem = createNode(
    'A 64-year-old patient has a split-depression lateral tibial plateau fracture after a skiing injury.',
    { 'data-question-id': 'OBQ24-001', 'data-topic-id': '1046' }
  );
  const choices = [
    createNode('A. Immediate total knee arthroplasty', { class: 'answer-choice' }),
    createNode('B. Long leg cast and nonoperative care', { class: 'answer-choice selected' }),
    createNode('C. ORIF with articular elevation and raft screws 72%', { class: 'answer-choice correct preferred' }),
    createNode('D. Hip hemiarthroplasty', { class: 'answer-choice' }),
  ];
  const explanation = createNode(
    'Split-depression plateau injuries are articular fractures that often require elevation of the joint surface, raft screws, and fixation stable enough for early motion.'
  );
  const link1 = createNode('OITE review', { href: '/oite' });
  const link2 = createNode('Plateau card', { href: '/cards/plateau' });
  const image = createNode('', {
    src: 'https://www.orthobullets.com/image123.jpg',
    alt: 'Plateau CT',
    width: '640',
    height: '480',
  });

  const selectorMap = new Map<string, unknown[]>([
    ['nav.breadcrumb a', [breadcrumb1, breadcrumb2]],
    ['.question-stem', [stem]],
    ['.question-answers li', choices],
    ['#explanation', [explanation]],
    ['.related-topics a', [link1, link2]],
    ['figure img', [image]],
    ['[data-question-id]', [stem]],
    ['[data-topic-id]', [stem]],
  ]);

  return {
    locationHref: 'https://www.orthobullets.com/trauma/1046/tibial-plateau-fractures?questionId=OBQ24-001',
    textContent: null,
    getAttribute() {
      return null;
    },
    querySelector(selector: string) {
      return (selectorMap.get(selector) as unknown[] | undefined)?.[0] ?? null;
    },
    querySelectorAll(selector: string) {
      return selectorMap.get(selector) ?? [];
    },
  };
}

const syntheticContext = extractOrthobulletsPageContext({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: createSyntheticDocument() as any,
});

assert.equal(syntheticContext.source, 'orthobullets');
assert.equal(syntheticContext.provider, 'orthobullets');
assert.equal(syntheticContext.pageKind, 'review');
assert.equal(syntheticContext.questionId, 'OBQ24-001');
assert.equal(syntheticContext.topicId, '1046');
assert.equal(syntheticContext.breadcrumbs.length, 2);
assert.equal(syntheticContext.answerChoices.length, 4);
assert.equal(syntheticContext.selectedAnswerKey, 'B');
assert.equal(syntheticContext.correctAnswerKey, 'C');
assert.match(syntheticContext.explanationText ?? '', /raft screws/i);
assert.equal(syntheticContext.images.length, 1);

const syntheticTestviewHtml = readFileSync(path.join(FIXTURES_DIR, 'synthetic-testview-review-page.html'), 'utf8');
assert.match(syntheticTestviewHtml, /Synthetic Orthobullets Testview Review Fixture/);
const { document: syntheticTestviewDocument } = parseHTML(syntheticTestviewHtml);
const syntheticTestviewContext = extractOrthobulletsPageContext({
  document: syntheticTestviewDocument,
  pageUrl: 'https://www.orthobullets.com/testview?qid=3794&ans=2',
});

assert.equal(syntheticTestviewContext.pageKind, 'review');
assert.equal(syntheticTestviewContext.questionId, '3794');
assert.equal(syntheticTestviewContext.breadcrumbs.length, 2);
assert.ok(syntheticTestviewContext.stem && syntheticTestviewContext.stem.length > 20);
assert.equal(syntheticTestviewContext.answerChoices.length, 4);
assert.equal(syntheticTestviewContext.selectedAnswerKey, '2');
assert.equal(syntheticTestviewContext.correctAnswerKey, '3');
assert.match(syntheticTestviewContext.explanationText ?? '', /unstable/i);
assert.equal(syntheticTestviewContext.percentDistribution.length, 4);
assert.equal(syntheticTestviewContext.images.length, 1);

const currentTestHtml = readFileSync(path.join(FIXTURES_DIR, 'synthetic-current-test-page.html'), 'utf8');
assert.match(currentTestHtml, /Synthetic Orthobullets Current Test Fixture/);
const { document: currentTestDocument } = parseHTML(currentTestHtml);
const currentTestContext = extractOrthobulletsPageContext({
  document: currentTestDocument,
  pageUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
});

assert.equal(currentTestContext.pageKind, 'current_test');
assert.equal(currentTestContext.questionId, '210999');
assert.equal(currentTestContext.breadcrumbs.length, 2);
assert.ok(currentTestContext.stem && currentTestContext.stem.length > 20);
assert.equal(currentTestContext.answerChoices.length, 4);
assert.equal(currentTestContext.correctAnswerKey, undefined);
assert.equal(currentTestContext.selectedAnswerKey, undefined);
assert.equal(currentTestContext.explanationText, undefined);
assert.equal(currentTestContext.images.length, 1);
assert.ok(currentTestContext.extractionWarnings.includes('correct_answer_not_visible'));
assert.ok(currentTestContext.extractionWarnings.includes('preferred_response_not_visible'));
assert.ok(currentTestContext.extractionWarnings.includes('explanation_not_visible'));

const missingFieldContext = extractOrthobulletsPageContext({
  document: {
    locationHref: 'https://www.orthobullets.com/trauma/1046/topic',
    textContent: null,
    getAttribute() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  },
});

assert.ok(missingFieldContext.extractionWarnings.length >= 3);
assert.equal(missingFieldContext.pageKind, 'unknown');
assert.equal(missingFieldContext.answerChoices.length, 0);
assert.equal(missingFieldContext.selectedAnswerKey, undefined);
assert.equal(missingFieldContext.correctAnswerKey, undefined);

const rockUnansweredHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-unanswered-question.html'), 'utf8');
assert.match(rockUnansweredHtml, /ROCK Synthetic Unanswered Fixture/);
assert.match(rockUnansweredHtml, /Synthetic ROCK fixture, not a real captured ROCK page/);
const { document: rockUnansweredDocument } = parseHTML(rockUnansweredHtml);
const rockUnansweredContext = extractQuestionContext({
  document: rockUnansweredDocument,
  pageUrl: 'https://rock.aaos.org/questions/ROCK-SYN-001',
});

assert.ok(rockUnansweredContext, 'ROCK unanswered fixture should be detected');
assert.equal(rockUnansweredContext.provider, 'rock');
assert.equal(rockUnansweredContext.mode, 'question');
assert.equal(rockUnansweredContext.pageKind, 'question');
assert.equal(rockUnansweredContext.questionId, 'ROCK-SYN-001');
assert.equal(rockUnansweredContext.topicId, 'adult-recon');
assert.equal(rockUnansweredContext.breadcrumbs.length, 2);
assert.match(rockUnansweredContext.stem ?? '', /jump distance/i);
assert.equal(rockUnansweredContext.answerChoices.length, 4);
assert.equal(rockUnansweredContext.selectedAnswerKey, null);
assert.equal(rockUnansweredContext.correctAnswerKey, null);
assert.equal(rockUnansweredContext.explanationText, null);
assert.ok(rockUnansweredContext.extractionWarnings.includes('correct_answer_not_visible'));
assert.ok(rockUnansweredContext.extractionWarnings.includes('explanation_not_visible'));
assert.equal(rockUnansweredContext.raw?.providerSpecific?.fixtureSource, 'synthetic_until_real_sanitized_captures_available');
assert.equal(rockUnansweredContext.raw?.providerSpecific?.stemStrategy, '[data-testid="question-stem"]');
assert.equal(rockUnansweredContext.raw?.providerSpecific?.choicesStrategy, '[data-testid="answer-choice"]');
assert.equal(rockUnansweredContext.raw?.providerSpecific?.explanationStrategy, 'not_found');

const rockAnsweredHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-answered-review.html'), 'utf8');
assert.match(rockAnsweredHtml, /ROCK Synthetic Answered Review Fixture/);
assert.match(rockAnsweredHtml, /Synthetic ROCK fixture, not a real captured ROCK page/);
const { document: rockAnsweredDocument } = parseHTML(rockAnsweredHtml);
const rockAnsweredContext = extractQuestionContext({
  document: rockAnsweredDocument,
  pageUrl: 'https://rock.aaos.org/review/questions/ROCK-SYN-002',
});

assert.ok(rockAnsweredContext, 'ROCK answered fixture should be detected');
assert.equal(rockAnsweredContext.provider, 'rock');
assert.equal(rockAnsweredContext.mode, 'question');
assert.equal(rockAnsweredContext.pageKind, 'review');
assert.equal(rockAnsweredContext.questionId, 'ROCK-SYN-002');
assert.equal(rockAnsweredContext.topicId, 'trauma');
assert.equal(rockAnsweredContext.selectedAnswerKey, 'B');
assert.equal(rockAnsweredContext.correctAnswerKey, 'C');
assert.match(rockAnsweredContext.selectedAnswer ?? '', /Functional brace/i);
assert.match(rockAnsweredContext.correctAnswer ?? '', /Open reduction/i);
assert.match(rockAnsweredContext.explanationText ?? '', /deltoid incompetence/i);
assert.equal(rockAnsweredContext.answerChoices.length, 4);
assert.match(String(rockAnsweredContext.raw?.providerSpecific?.answerStateStrategy), /selected:aria_or_data/);
assert.match(String(rockAnsweredContext.raw?.providerSpecific?.answerStateStrategy), /correct:data_attr/);

const rockMediaHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-question-with-media.html'), 'utf8');
assert.match(rockMediaHtml, /ROCK Synthetic Media Fixture/);
assert.match(rockMediaHtml, /Synthetic ROCK fixture, not a real captured ROCK page/);
const { document: rockMediaDocument } = parseHTML(rockMediaHtml);
const rockMediaContext = extractQuestionContext({
  document: rockMediaDocument,
  pageUrl: 'https://rock.aaos.org/questions/ROCK-SYN-003',
});

assert.ok(rockMediaContext, 'ROCK media fixture should be detected');
assert.equal(rockMediaContext.provider, 'rock');
assert.equal(rockMediaContext.images.length, 1);
assert.equal(rockMediaContext.images[0]?.src, 'https://example.test/sanitized-rock-elbow-xray.jpg');
assert.equal(rockMediaContext.images[0]?.alt, 'Sanitized elbow radiograph');
assert.equal(rockMediaContext.answerChoices.length, 4);

const rockCurriculumHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-curriculum-long-article.html'), 'utf8');
assert.match(rockCurriculumHtml, /Synthetic ROCK curriculum fixture/);
const { document: rockCurriculumDocument } = parseHTML(rockCurriculumHtml);
const rockCurriculumContext = extractQuestionContext({
  document: rockCurriculumDocument,
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=LOCAL-ANESTHESIA',
});

assert.ok(rockCurriculumContext, 'ROCK curriculum article should be detected');
assert.equal(rockCurriculumContext.provider, 'rock');
assert.equal(rockCurriculumContext.mode, 'curriculum_content');
assert.equal(rockCurriculumContext.pageKind, 'curriculum_content');
assert.match(rockCurriculumContext.title ?? '', /Local Anesthesia/i);
assert.ok((rockCurriculumContext.contentText ?? '').length >= 500);
assert.ok((rockCurriculumContext.contentSections ?? []).length >= 3);
assert.ok((rockCurriculumContext.sectionHeadings ?? []).includes('Learning Objectives'));
assert.ok((rockCurriculumContext.learningObjectives ?? []).length >= 3);
assert.match((rockCurriculumContext.learningObjectives ?? []).join(' '), /systemic toxicity/i);
assert.ok(!rockCurriculumContext.contentText?.includes('Send feedback'));
assert.equal(rockCurriculumContext.answerChoices.length, 0);
assert.equal(rockCurriculumContext.raw?.providerSpecific?.hasCurriculumContent, true);
assert.equal(rockCurriculumContext.classification?.pageKind, 'educational_content');
assert.ok(rockCurriculumContext.contentMarkdown && rockCurriculumContext.contentMarkdown.length >= 500);

const rockReferencesHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-curriculum-references.html'), 'utf8');
assert.match(rockReferencesHtml, /Recommended Reading/);
const { document: rockReferencesDocument } = parseHTML(rockReferencesHtml);
const rockReferencesContext = extractQuestionContext({
  document: rockReferencesDocument,
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=READING',
});

assert.ok(rockReferencesContext, 'ROCK references-heavy page should be detected');
assert.equal(rockReferencesContext.mode, 'curriculum_content');
assert.ok((rockReferencesContext.references ?? []).length >= 3);
assert.equal(rockReferencesContext.classification?.pageKind, 'educational_content');

const rockTableHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-curriculum-with-table.html'), 'utf8');
const { document: rockTableDocument } = parseHTML(rockTableHtml);
const rockTableContext = extractQuestionContext({
  document: rockTableDocument,
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=COMPARTMENT',
});

assert.ok(rockTableContext, 'ROCK table page should be detected');
assert.ok((rockTableContext.tablesCount ?? 0) >= 1);
assert.match(rockTableContext.contentMarkdown ?? '', /\| Finding \| Timing \|/);

const rockCurriculumMediaHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-curriculum-media-article.html'), 'utf8');
assert.match(rockCurriculumMediaHtml, /Synthetic ROCK curriculum fixture with media/);
const { document: rockCurriculumMediaDocument } = parseHTML(rockCurriculumMediaHtml);
const rockCurriculumMediaContext = extractQuestionContext({
  document: rockCurriculumMediaDocument,
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=POSITIONING',
});

assert.ok(rockCurriculumMediaContext, 'ROCK curriculum media article should be detected');
assert.equal(rockCurriculumMediaContext.mode, 'curriculum_content');
assert.equal(rockCurriculumMediaContext.images.length, 1);
assert.equal(rockCurriculumMediaContext.images[0]?.src, 'https://example.test/sanitized-rock-positioning.jpg');
assert.match(rockCurriculumMediaContext.contentText ?? '', /pressure points/i);

const rockSparseHtml = readFileSync(path.join(FIXTURES_DIR, 'rock-curriculum-sparse.html'), 'utf8');
assert.match(rockSparseHtml, /Synthetic sparse ROCK page/);
const { document: rockSparseDocument } = parseHTML(rockSparseHtml);
const rockSparseContext = extractQuestionContext({
  document: rockSparseDocument,
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=SPARSE',
});

assert.ok(rockSparseContext, 'Sparse ROCK page should return diagnostics context instead of throwing');
assert.equal(rockSparseContext.mode, 'curriculum_content');
assert.ok((rockSparseContext.contentText ?? '').length < 500);
assert.ok(rockSparseContext.extractionWarnings.includes('curriculum_content_not_visible'));

const unsupportedRockLikeHtml = `
  <!doctype html>
  <html>
    <head><title>ROCK Curriculum Dashboard</title></head>
    <body>
      <main>
        <nav aria-label="breadcrumb"><a>ROCK Curriculum</a><a>Dashboard</a></nav>
        <article>
          <p>Welcome to the ROCK curriculum dashboard. Review modules, progress, and announcements here.</p>
          <p>This is readable page content but it is not a question stem.</p>
        </article>
        <button>Continue</button>
        <button>Open module list</button>
      </main>
    </body>
  </html>
`;
const { document: unsupportedRockLikeDocument } = parseHTML(unsupportedRockLikeHtml);
const unsupportedRockLikeContext = extractQuestionContext({
  document: unsupportedRockLikeDocument,
  pageUrl: 'https://rock.aaos.org/dashboard',
});

assert.ok(unsupportedRockLikeContext, 'ROCK-like dashboard should return diagnostics context instead of throwing');
assert.equal(unsupportedRockLikeContext.provider, 'rock');
assert.equal(unsupportedRockLikeContext.stem, undefined);
assert.equal(unsupportedRockLikeContext.answerChoices.length, 0);
assert.equal(unsupportedRockLikeContext.raw?.providerSpecific?.stemStrategy, 'skipped_non_question_page');
assert.equal(unsupportedRockLikeContext.raw?.providerSpecific?.choicesStrategy, 'skipped_non_question_page');
assert.ok(unsupportedRockLikeContext.extractionWarnings.includes('stem_not_visible'));
assert.ok(unsupportedRockLikeContext.extractionWarnings.includes('answer_choices_not_visible'));

const unsupportedDocument = {
  locationHref: 'https://example.test/article',
  title: 'Generic readable article',
  textContent: 'This readable page has paragraphs but no recognized question provider.',
  getAttribute() {
    return null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
assert.equal(detectQuestionProvider({ document: unsupportedDocument as any }), null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
assert.equal(extractQuestionContext({ document: unsupportedDocument as any }), null);

// --- Orthobullets topic page (Orthobullets Page Mode) --------------------

assert.equal(isLikelyOrthobulletsTopicUrl('https://www.orthobullets.com/trauma/1042/femoral-neck-fractures'), true);
assert.equal(isLikelyOrthobulletsTopicUrl('https://www.orthobullets.com/topic/1042/femoral-neck-fractures'), true);
assert.equal(isLikelyOrthobulletsTopicUrl('https://www.orthobullets.com/question/1096'), false);
assert.equal(isLikelyOrthobulletsTopicUrl('https://www.orthobullets.com/currenttest/55'), false);

const topicHtml = readFileSync(path.join(FIXTURES_DIR, 'synthetic-orthobullets-topic-page.html'), 'utf8');
const { document: topicDocument } = parseHTML(topicHtml);
const topicPageUrl = 'https://www.orthobullets.com/trauma/1042/femoral-neck-fractures';

const topicContext = extractOrthobulletsTopicPageContext({ document: topicDocument, pageUrl: topicPageUrl });
assert.equal(topicContext.source, 'orthobullets');
assert.equal(topicContext.provider, 'orthobullets');
assert.equal(topicContext.mode, 'topic_page');
assert.equal(topicContext.pageKind, 'topic');
assert.equal(topicContext.title, 'Femoral Neck Fractures');
assert.equal(topicContext.topicId, '1042');
assert.ok(topicContext.breadcrumbs.length >= 1, 'expected at least one breadcrumb');
assert.ok((topicContext.sectionHeadings ?? []).includes('Treatment'), 'expected a Treatment section heading');
assert.ok((topicContext.sectionHeadings ?? []).includes('Classification'), 'expected a Classification section heading');
assert.match(topicContext.contentText ?? '', /avascular necrosis/i);
assert.ok((topicContext.tablesMarkdown ?? []).length >= 1, 'expected the Garden classification table to be extracted');
assert.equal(topicContext.images.length, 1);
assert.equal(topicContext.questionCount, 42);
assert.equal(topicContext.cardCount, 11);
assert.equal(topicContext.videoCount, 5);
assert.equal(topicContext.answerChoices.length, 0);
assert.equal(topicContext.classification?.pageKind, 'topic_page');

// The top-level dispatcher should route a topic URL straight to the topic
// extractor rather than the question-only Orthobullets extractor.
const dispatchedTopicContext = extractQuestionContext({ document: topicDocument, pageUrl: topicPageUrl });
assert.equal(dispatchedTopicContext?.mode, 'topic_page');

const ranRealFixtures = REAL_FIXTURES.length - skippedRealFixtures;
console.log(
  `Question extractor tests passed (${ranRealFixtures}/${REAL_FIXTURES.length} real Orthobullets fixtures run, ${skippedRealFixtures} skipped (not present locally) + Orthobullets/ROCK synthetic sanity checks).`
);
if (skippedRealFixtures > 0) {
  console.log(
    'Note: real fixtures are gitignored and manually captured (see README). Capture them locally for full extractor coverage.'
  );
}
