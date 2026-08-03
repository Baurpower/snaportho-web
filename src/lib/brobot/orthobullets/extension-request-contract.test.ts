import assert from 'node:assert/strict';

import {
  CurriculumExplainRequestSchema,
  OrthobulletsChatRequestSchema,
  OrthobulletsExplainRequestSchema,
  OrthobulletsHintRequestSchema,
  type OrthobulletsPageContext,
} from './types';

const questionPageContext: OrthobulletsPageContext = {
  source: 'orthobullets',
  provider: 'orthobullets',
  mode: 'question',
  pageUrl: 'https://www.orthobullets.com/testview?qid=123',
  sourceUrl: 'https://www.orthobullets.com/testview?qid=123',
  pageKind: 'current_test',
  questionId: '123',
  stem: 'A patient has a displaced femoral neck fracture. What is the best next step?',
  breadcrumbs: ['Trauma'],
  answerChoices: [
    { key: 'A', text: 'Observation' },
    { key: 'B', text: 'Operative management' },
  ],
  selectedAnswerKey: 'B',
  correctAnswerKey: 'B',
  explanationText: 'Operative treatment is indicated.',
  percentDistribution: [],
  linkedConcepts: [],
  images: [],
  extractionWarnings: [],
};

const curriculumPageContext: OrthobulletsPageContext = {
  source: 'rock',
  provider: 'rock',
  mode: 'curriculum_content',
  pageUrl: 'https://rock.aaos.org/courseContent.aspx?ID=510000554&currID=19&currTopID=24741',
  sourceUrl: 'https://rock.aaos.org/courseContent.aspx?ID=510000554&currID=19&currTopID=24741',
  pageKind: 'curriculum_content',
  title: 'Surgical Anatomy of the Hip',
  breadcrumbs: ['Chapters', 'Hip and Knee | Hip'],
  contentText: 'Substantial hip anatomy curriculum content. '.repeat(60),
  contentSections: [
    {
      heading: 'Overview',
      text: 'Substantial hip anatomy curriculum content. '.repeat(30),
    },
  ],
  answerChoices: [],
  percentDistribution: [],
  linkedConcepts: [],
  images: [],
  extractionWarnings: [],
};

assert.equal(
  CurriculumExplainRequestSchema.safeParse({
    contractVersion: 'curriculum-explain-v2',
    task: 'curriculum_explain',
    provider: 'rock',
    sourceUrl: curriculumPageContext.sourceUrl,
    pageContext: curriculumPageContext,
    curriculum: {
      title: 'Surgical Anatomy of the Hip',
      breadcrumbs: ['Chapters', 'Hip and Knee | Hip'],
      sections: [{ heading: 'Overview', text: 'Substantial hip anatomy curriculum content. '.repeat(30) }],
    },
  }).success,
  true,
  'valid ROCK curriculum payload should pass without question fields'
);

const longHipResurfacingPayload = {
  contractVersion: 'curriculum-explain-v2' as const,
  task: 'curriculum_explain' as const,
  provider: 'rock' as const,
  sourceUrl: 'https://rock.aaos.org/courseContent.aspx?ID=6004018&currID=19&currTopID=24742&yearID=',
  pageContext: {
    ...curriculumPageContext,
    pageUrl: 'https://rock.aaos.org/courseContent.aspx?ID=6004018&currID=19&currTopID=24742&yearID=',
    sourceUrl: 'https://rock.aaos.org/courseContent.aspx?ID=6004018&currID=19&currTopID=24742&yearID=',
    title: 'Alternative Implant Designs: Hip Resurfacing',
    contentText: null,
    contentMarkdown: null,
    contentSections: [],
  },
  curriculum: {
    title: 'Alternative Implant Designs: Hip Resurfacing',
    breadcrumbs: ['Chapters', 'Hip and Knee | Hip'],
    sections: Array.from({ length: 28 }, (_, index) => ({
      id: `section-${index + 1}`,
      heading: `Synthetic hip resurfacing section ${index + 1}`,
      level: 2,
      text: `Synthetic educational sentence for contract testing section ${index + 1}. `.repeat(20),
    })),
  },
};
assert.ok(JSON.stringify(longHipResurfacingPayload).length >= 25_000);
const parsedLongHipPayload = CurriculumExplainRequestSchema.safeParse(longHipResurfacingPayload);
assert.equal(parsedLongHipPayload.success, true, parsedLongHipPayload.success ? undefined : JSON.stringify(parsedLongHipPayload.error.issues));

const normalizedFailureReproduction = {
  ...longHipResurfacingPayload,
  curriculum: {
    ...longHipResurfacingPayload.curriculum,
    tables: [
      { caption: 'Table 1', rows: [['normal']] },
      { caption: 'Table 2', rows: [['x'.repeat(1000)]] },
      { caption: 'Table 3', rows: [['normal']] },
      { caption: 'Table 4', rows: [['🦴'.repeat(500)]] },
    ],
  },
};
const parsedNormalizedFailureReproduction = CurriculumExplainRequestSchema.safeParse(normalizedFailureReproduction);
assert.equal(
  parsedNormalizedFailureReproduction.success,
  true,
  parsedNormalizedFailureReproduction.success ? undefined : JSON.stringify(parsedNormalizedFailureReproduction.error.issues)
);

assert.equal(
  CurriculumExplainRequestSchema.safeParse({
    task: 'curriculum_explain',
    provider: 'rock',
    sourceUrl: curriculumPageContext.sourceUrl,
    pageContext: curriculumPageContext,
    curriculum: {
      title: 'Surgical Anatomy of the Hip',
      sections: [],
    },
  }).success,
  false,
  'empty curriculum payload should fail with curriculum validation'
);

assert.equal(
  OrthobulletsExplainRequestSchema.safeParse({
    task: 'question_explain',
    pageContext: curriculumPageContext,
  }).success,
  false,
  'curriculum page must remain rejected by the question explain contract'
);

assert.equal(
  OrthobulletsExplainRequestSchema.safeParse({
    task: 'question_explain',
    pageContext: {
      ...questionPageContext,
      stem: undefined,
    },
  }).success,
  false,
  'question explain without stem should fail'
);

assert.equal(
  OrthobulletsHintRequestSchema.safeParse({
    task: 'question_hint',
    pageContext: {
      ...questionPageContext,
      answerChoices: [],
    },
    hintLevel: 1,
  }).success,
  false,
  'question hint without choices should fail'
);

assert.equal(
  OrthobulletsHintRequestSchema.safeParse({
    task: 'question_hint',
    pageContext: questionPageContext,
    hintLevel: 2,
    priorHints: [{
      hintLevel: 1,
      title: 'Orient to the clue',
      hint: 'Identify the category that separates the options.',
    }],
  }).success,
  true,
  'later hints should accept preceding learner-visible hints'
);

assert.equal(
  OrthobulletsHintRequestSchema.safeParse({
    task: 'question_hint',
    pageContext: questionPageContext,
    hintLevel: 1,
    priorHints: [{
      hintLevel: 1,
      title: 'Invalid current hint',
      hint: 'A current-level hint cannot be prior context.',
    }],
  }).success,
  false,
  'prior hints must precede the requested level'
);

assert.equal(
  OrthobulletsExplainRequestSchema.safeParse({
    task: 'question_explain',
    pageContext: questionPageContext,
  }).success,
  true,
  'valid question explain payload should pass'
);

// Regression: a rich curriculum page whose forwarded pageContext exceeds the
// per-field caps (e.g. >20 images, >12 breadcrumbs, long title) must still be
// accepted. Previously these were rejected wholesale as `invalid_request_shape`
// ("extension and server curriculum formats do not match"); the server now
// clamps the pass-through pageContext because it rebuilds the context it uses
// from `curriculum`.
const overCapCurriculumPayload = {
  contractVersion: 'curriculum-explain-v2' as const,
  task: 'curriculum_explain' as const,
  provider: 'rock' as const,
  sourceUrl: 'https://rock.aaos.org/coursecontent.aspx?id=6004007',
  pageContext: {
    ...curriculumPageContext,
    title: 'General Anesthesia '.repeat(30), // > 300 chars
    breadcrumbs: Array.from({ length: 18 }, (_, index) => `Breadcrumb ${index + 1}`), // > 12
    sectionHeadings: Array.from({ length: 140 }, (_, index) => `Heading ${index + 1}`), // > 120
    references: Array.from({ length: 55 }, (_, index) => `Reference ${index + 1}`), // > 40
    linkedConcepts: Array.from({ length: 30 }, (_, index) => ({ label: `Concept ${index + 1}` })), // > 20
    images: Array.from({ length: 30 }, (_, index) => ({
      src: `https://rock.aaos.org/img/${index}.png`,
      alt: 'Anatomical figure '.repeat(40), // > 500 chars
    })), // > 20
    contentText: null,
    contentMarkdown: null,
    contentSections: [],
  },
  curriculum: {
    title: 'General Anesthesia',
    breadcrumbs: ['Basic Science', 'Anesthesia'],
    sections: [{ heading: 'ASA Classification', text: 'Preoperative evaluation and ASA classification. '.repeat(30) }],
  },
};
const parsedOverCapCurriculum = CurriculumExplainRequestSchema.safeParse(overCapCurriculumPayload);
assert.equal(
  parsedOverCapCurriculum.success,
  true,
  parsedOverCapCurriculum.success ? undefined : JSON.stringify(parsedOverCapCurriculum.error.issues)
);
if (parsedOverCapCurriculum.success) {
  assert.ok(parsedOverCapCurriculum.data.pageContext.images.length <= 20, 'images should be clamped to the cap');
  assert.ok((parsedOverCapCurriculum.data.pageContext.breadcrumbs?.length ?? 0) <= 12, 'breadcrumbs should be clamped to the cap');
  assert.ok((parsedOverCapCurriculum.data.pageContext.title?.length ?? 0) <= 300, 'title should be clamped to the cap');
}

assert.equal(
  OrthobulletsChatRequestSchema.safeParse({
    pageContext: {
      ...questionPageContext,
      selectedAnswerKey: undefined,
      correctAnswerKey: undefined,
      explanationText: undefined,
    },
    answerState: 'unanswered',
    history: [],
    userMessage: 'What clue should I focus on?',
  }).success,
  true,
  'unanswered coaching chat should work without a generated explanation'
);

assert.equal(
  OrthobulletsChatRequestSchema.safeParse({
    pageContext: questionPageContext,
    answerState: 'unanswered',
    explanation: {
      bottomLine: 'Answer',
      testedConcept: 'Concept',
      whyCorrect: 'Reason',
      whyWrong: [],
      boardPearl: 'Pearl',
      studyNext: [],
      warnings: [],
    },
    history: [],
    userMessage: 'Give me the answer',
  }).success,
  false,
  'unanswered coaching chat must reject review-only explanation content'
);

console.log('BroBot extension request contract tests passed.');
