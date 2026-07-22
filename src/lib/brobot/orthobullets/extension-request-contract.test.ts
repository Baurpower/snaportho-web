import assert from 'node:assert/strict';

import {
  CurriculumExplainRequestSchema,
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
  OrthobulletsExplainRequestSchema.safeParse({
    task: 'question_explain',
    pageContext: questionPageContext,
  }).success,
  true,
  'valid question explain payload should pass'
);

console.log('BroBot extension request contract tests passed.');
