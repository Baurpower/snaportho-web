"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const types_1 = require("./types");
const questionPageContext = {
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
const curriculumPageContext = {
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
strict_1.default.equal(types_1.CurriculumExplainRequestSchema.safeParse({
    task: 'curriculum_explain',
    provider: 'rock',
    sourceUrl: curriculumPageContext.sourceUrl,
    pageContext: curriculumPageContext,
    curriculum: {
        title: 'Surgical Anatomy of the Hip',
        breadcrumbs: ['Chapters', 'Hip and Knee | Hip'],
        sections: [{ heading: 'Overview', text: 'Substantial hip anatomy curriculum content. '.repeat(30) }],
    },
}).success, true, 'valid ROCK curriculum payload should pass without question fields');
strict_1.default.equal(types_1.CurriculumExplainRequestSchema.safeParse({
    task: 'curriculum_explain',
    provider: 'rock',
    sourceUrl: curriculumPageContext.sourceUrl,
    pageContext: curriculumPageContext,
    curriculum: {
        title: 'Surgical Anatomy of the Hip',
        sections: [],
    },
}).success, false, 'empty curriculum payload should fail with curriculum validation');
strict_1.default.equal(types_1.OrthobulletsExplainRequestSchema.safeParse({
    task: 'question_explain',
    pageContext: curriculumPageContext,
}).success, false, 'curriculum page must remain rejected by the question explain contract');
strict_1.default.equal(types_1.OrthobulletsExplainRequestSchema.safeParse({
    task: 'question_explain',
    pageContext: {
        ...questionPageContext,
        stem: undefined,
    },
}).success, false, 'question explain without stem should fail');
strict_1.default.equal(types_1.OrthobulletsHintRequestSchema.safeParse({
    task: 'question_hint',
    pageContext: {
        ...questionPageContext,
        answerChoices: [],
    },
    hintLevel: 1,
}).success, false, 'question hint without choices should fail');
strict_1.default.equal(types_1.OrthobulletsExplainRequestSchema.safeParse({
    task: 'question_explain',
    pageContext: questionPageContext,
}).success, true, 'valid question explain payload should pass');
console.log('BroBot extension request contract tests passed.');
