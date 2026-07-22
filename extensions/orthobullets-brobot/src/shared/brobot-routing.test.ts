import * as assert from 'node:assert/strict';

import {
  buildCurriculumExplainRequest,
  buildQuestionExplainRequest,
  buildQuestionHintRequest,
  CURRICULUM_CONTRACT_LIMITS,
  resolveBroBotEndpoint,
  validateCurriculumExplainRequest,
} from './brobot-routing.js';
import { EXTENSION_BUILD_ID, ROUTING_CONTRACT_VERSION, isCompatibleExtensionBuild } from './build-info.js';
import type { OrthobulletsPageContext } from './types.js';

const rockCurriculumContext: OrthobulletsPageContext = {
  source: 'rock',
  provider: 'rock',
  mode: 'curriculum_content',
  pageUrl: 'https://rock.aaos.org/courseContent.aspx?ID=510000554&currID=19&currTopID=24741',
  sourceUrl: 'https://rock.aaos.org/courseContent.aspx?ID=510000554&currID=19&currTopID=24741',
  pageKind: 'curriculum_content',
  title: 'Surgical Anatomy of the Hip',
  breadcrumbs: ['Chapters', 'Hip and Knee | Hip'],
  contentText: 'x'.repeat(14000),
  contentSections: Array.from({ length: 20 }, (_, index) => ({
    heading: `Heading ${index + 1}`,
    text: `Section ${index + 1} ` + 'hip anatomy '.repeat(40),
  })),
  answerChoices: [],
  percentDistribution: [],
  linkedConcepts: [],
  images: [],
  raw: {
    providerSpecific: {
      hasCurriculumContent: true,
      sectionCount: 20,
      headingCount: 29,
    },
  },
  classification: {
    pageKind: 'educational_content',
    confidence: 0.92,
    reason: 'Readable curriculum content',
    detected: {
      hasStem: false,
      answerChoiceCount: 0,
      readableTextLength: 14000,
      headings: ['Surgical Anatomy of the Hip'],
      referencesCount: 0,
      tablesCount: 4,
      imagesCount: 20,
      activeUrl: 'https://rock.aaos.org/courseContent.aspx?ID=510000554&currID=19&currTopID=24741',
      title: 'Surgical Anatomy of the Hip',
    },
  },
  extractionWarnings: [],
};

const orthobulletsLearningContext: OrthobulletsPageContext = {
  ...rockCurriculumContext,
  source: 'orthobullets',
  provider: 'orthobullets',
  pageUrl: 'https://www.orthobullets.com/recon/5001/sample-topic',
  sourceUrl: 'https://www.orthobullets.com/recon/5001/sample-topic',
};

const questionContext: OrthobulletsPageContext = {
  source: 'orthobullets',
  provider: 'orthobullets',
  mode: 'question',
  pageUrl: 'https://www.orthobullets.com/testview?qid=123',
  sourceUrl: 'https://www.orthobullets.com/testview?qid=123',
  pageKind: 'current_test',
  questionId: '123',
  stem: 'A patient has a femoral neck fracture. What is the next step?',
  breadcrumbs: ['Trauma'],
  answerChoices: [
    { key: 'A', text: 'Nonoperative management' },
    { key: 'B', text: 'Operative fixation' },
  ],
  selectedAnswerKey: 'B',
  correctAnswerKey: 'B',
  explanationText: 'Operative fixation is preferred in this scenario.',
  percentDistribution: [],
  linkedConcepts: [],
  images: [],
  extractionWarnings: [],
};

const rockRequest = buildCurriculumExplainRequest(rockCurriculumContext);
assert.equal(resolveBroBotEndpoint(rockRequest), '/api/brobot/curriculum/explain');
assert.equal(rockRequest.task, 'curriculum_explain');
assert.equal(rockRequest.provider, 'rock');
assert.equal(rockRequest.curriculum.title, 'Surgical Anatomy of the Hip');
assert.deepEqual(rockRequest.curriculum.breadcrumbs, ['Chapters', 'Hip and Knee | Hip']);
assert.equal(rockRequest.curriculum.sections.length, 20);
assert.notEqual(resolveBroBotEndpoint(rockRequest), '/api/brobot/orthobullets/explain');

const orthobulletsLearningRequest = buildCurriculumExplainRequest(orthobulletsLearningContext);
assert.equal(resolveBroBotEndpoint(orthobulletsLearningRequest), '/api/brobot/curriculum/explain');

assert.equal(resolveBroBotEndpoint(buildQuestionHintRequest(questionContext)), '/api/brobot/orthobullets/hint');
assert.equal(resolveBroBotEndpoint(buildQuestionExplainRequest(questionContext)), '/api/brobot/orthobullets/explain');

const hugeContext: OrthobulletsPageContext = {
  ...rockCurriculumContext,
  contentSections: Array.from({ length: 40 }, (_, index) => ({
    heading: `Large heading ${index + 1}`,
    text: `Large section ${index + 1} ` + 'content '.repeat(1000),
  })),
};
const hugeRequest = buildCurriculumExplainRequest(hugeContext);
assert.equal(hugeRequest.pageContext.raw?.providerSpecific?.wasTruncated, false);
assert.equal(hugeRequest.pageContext.raw?.providerSpecific?.omittedSectionCount, 0);
assert.equal(hugeRequest.curriculum.sections.length, 40, 'large pages should preserve every structured section');
assert.equal(hugeRequest.pageContext.contentText, null, 'transport should not duplicate the structured curriculum');

const hipResurfacingContext: OrthobulletsPageContext = {
  ...rockCurriculumContext,
  title: 'Alternative Implant Designs: Hip Resurfacing',
  pageUrl: 'https://rock.aaos.org/courseContent.aspx?ID=6004018&currID=19&currTopID=24742&yearID=',
  sourceUrl: 'https://rock.aaos.org/courseContent.aspx?ID=6004018&currID=19&currTopID=24742&yearID=',
  contentSections: Array.from({ length: 28 }, (_, index) => ({
    heading: `Synthetic hip resurfacing section ${index + 1}`,
    text: `Synthetic educational sentence for contract testing section ${index + 1}. `.repeat(20),
  })),
};
const hipResurfacingRequest = buildCurriculumExplainRequest(hipResurfacingContext);
assert.equal(hipResurfacingRequest.contractVersion, 'curriculum-explain-v2');
assert.equal(hipResurfacingRequest.curriculum.sections.length, 28);
assert.ok(hipResurfacingRequest.curriculum.sections.reduce((sum, section) => sum + section.text.length, 0) >= 25_000);
assert.equal(validateCurriculumExplainRequest(hipResurfacingRequest).success, true);

const oversizedTablesContext: OrthobulletsPageContext = {
  ...hipResurfacingContext,
  tablesMarkdown: [
    'normal table',
    `Clinical table ${'long-cell '.repeat(180)}`,
    'another normal table',
    `Unicode table ${'🦴'.repeat(1200)}`,
  ],
};
const boundedTablesRequest = buildCurriculumExplainRequest(oversizedTablesContext);
assert.equal(boundedTablesRequest.curriculum.tables?.length, 4);
assert.equal((boundedTablesRequest.curriculum.tables?.[1]?.rows[0]?.[0] ?? '').length, CURRICULUM_CONTRACT_LIMITS.tableCell);
assert.ok((boundedTablesRequest.curriculum.tables?.[3]?.rows[0]?.[0] ?? '').length <= CURRICULUM_CONTRACT_LIMITS.tableCell);
assert.equal((boundedTablesRequest.curriculum.tables?.[3]?.rows[0]?.[0] ?? '').endsWith('\ud83e'), false, 'Unicode truncation must not split a surrogate pair');
assert.equal(boundedTablesRequest.pageContext.raw?.providerSpecific?.truncatedTableCellCount, 2);
assert.equal(validateCurriculumExplainRequest({ ...boundedTablesRequest, emphasis: 'high_yield' }).success, true, 'the exact serialized request must satisfy client validation');

const invalidTablesRequest = structuredClone(boundedTablesRequest);
invalidTablesRequest.curriculum.tables![1]!.rows[0]![0] = 'x'.repeat(CURRICULUM_CONTRACT_LIMITS.tableCell + 1);
const invalidResult = validateCurriculumExplainRequest(invalidTablesRequest);
assert.equal(invalidResult.success, false);
assert.equal(invalidResult.issues.some((issue) => issue.path === 'curriculum.tables.1.rows.0.0' && issue.code === 'too_big'), true);

assert.equal(isCompatibleExtensionBuild({ extensionBuildId: EXTENSION_BUILD_ID, routingContractVersion: ROUTING_CONTRACT_VERSION }), true);
assert.equal(isCompatibleExtensionBuild({ extensionBuildId: 'stale-build', routingContractVersion: ROUTING_CONTRACT_VERSION }), false);

console.log('BroBot endpoint resolver tests passed.');
