"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurriculumExplainRequestSchema = exports.CurriculumStudyResponseSchema = exports.CurriculumExplainEmphasisSchema = void 0;
exports.isCurriculumStudyResponse = isCurriculumStudyResponse;
const zod_1 = require("zod");
exports.CurriculumExplainEmphasisSchema = zod_1.z.enum(['high_yield', 'clinical', 'boards', 'or']);
const MustKnowGroupSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(120),
    bullets: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).min(1).max(8),
});
const AttendingQuestionSchema = zod_1.z.object({
    question: zod_1.z.string().trim().min(1).max(240),
    answer: zod_1.z.string().trim().min(1).max(400),
    difficulty: zod_1.z.enum(['MS3', 'PGY1', 'PGY2+']),
});
const MiniQuizItemSchema = zod_1.z.object({
    question: zod_1.z.string().trim().min(1).max(240),
    choices: zod_1.z.array(zod_1.z.string().trim().min(1).max(160)).max(6).optional(),
    answer: zod_1.z.string().trim().min(1).max(160),
    explanation: zod_1.z.string().trim().min(1).max(400),
});
const LearningObjectiveCoverageSchema = zod_1.z.object({
    objective: zod_1.z.string().trim().min(1).max(300),
    status: zod_1.z.enum(['covered', 'partial', 'not_covered']).optional(),
    highYieldPoint: zod_1.z.string().trim().min(1).max(240).optional(),
});
const ComparisonTableSchema = zod_1.z.object({
    headers: zod_1.z.array(zod_1.z.string().trim().min(1).max(80)).min(2).max(8),
    rows: zod_1.z.array(zod_1.z.array(zod_1.z.string().trim().min(1).max(160)).min(2).max(8)).max(12),
});
exports.CurriculumStudyResponseSchema = zod_1.z.object({
    responseKind: zod_1.z.literal('curriculum'),
    explanationId: zod_1.z.string().uuid(),
    emphasis: exports.CurriculumExplainEmphasisSchema,
    oneSentenceTakeaway: zod_1.z.string().trim().min(1).max(280),
    inThirtySeconds: zod_1.z.array(zod_1.z.string().trim().min(1).max(200)).min(1).max(6),
    mustKnow: zod_1.z.array(MustKnowGroupSchema).max(6).default([]),
    clinicalPearls: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(8).default([]),
    commonMistakes: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(8).default([]),
    attendingQuestions: zod_1.z.array(AttendingQuestionSchema).max(6).default([]),
    testableFacts: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(10).default([]),
    miniQuiz: zod_1.z.array(MiniQuizItemSchema).max(4).default([]),
    memoryHooks: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(6).default([]),
    suggestedFollowUps: zod_1.z.array(zod_1.z.string().trim().min(1).max(200)).max(8).default([]),
    nextReviewTopics: zod_1.z.array(zod_1.z.string().trim().min(1).max(160)).max(6).default([]),
    learningObjectives: zod_1.z.array(LearningObjectiveCoverageSchema).max(12).default([]),
    comparisonTable: ComparisonTableSchema.optional(),
    deepDive: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(8).default([]),
    referencesNote: zod_1.z.string().trim().min(1).max(400).optional(),
    fallbackBullets: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(6).optional(),
    parseError: zod_1.z.string().trim().min(1).max(300).optional(),
    warnings: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(20).default([]),
    usage: zod_1.z
        .object({
        remainingToday: zod_1.z.number().int().min(0).nullable(),
        dailyCap: zod_1.z.number().int().min(0).nullable(),
        unlimited: zod_1.z.boolean(),
    })
        .optional(),
});
exports.CurriculumExplainRequestSchema = zod_1.z.object({
    pageContext: zod_1.z.any(),
    emphasis: exports.CurriculumExplainEmphasisSchema.default('high_yield'),
});
function isCurriculumStudyResponse(value) {
    return value?.responseKind === 'curriculum';
}
