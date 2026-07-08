"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrthobulletsTopicTutorResponseSchema = exports.OrthobulletsTopicTutorRequestSchema = exports.OrthobulletsTopicTutorTurnSchema = exports.OrthobulletsTopicProgressSchema = exports.OrthobulletsTopicActionSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
// Orthobullets Page Mode — active-reading tutor for topic pages. Kept in its
// own schema/prompt/parser (not shared with ROCK's curriculum_content path
// or the question-tutor path) so the two modes can't accidentally end up
// reusing the same generic "teach this page" prompt.
exports.OrthobulletsTopicActionSchema = zod_1.z.enum([
    'quiz_me',
    'find_answer',
    'explain_section',
    'what_tested',
    'attending_question',
    'explain_images',
    'board_traps',
    'save_missed',
]);
exports.OrthobulletsTopicProgressSchema = zod_1.z.object({
    sectionsCompleted: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(40).default([]),
    conceptsMastered: zod_1.z.array(zod_1.z.string().trim().min(1).max(160)).max(60).default([]),
    conceptsMissed: zod_1.z.array(zod_1.z.string().trim().min(1).max(160)).max(60).default([]),
    savedPearls: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(40).default([]),
    tier: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3), zod_1.z.literal(4), zod_1.z.literal(5)]).default(1),
});
exports.OrthobulletsTopicTutorTurnSchema = zod_1.z.object({
    role: zod_1.z.enum(['user', 'assistant']),
    content: zod_1.z.string().trim().min(1).max(4000),
});
exports.OrthobulletsTopicTutorRequestSchema = zod_1.z.object({
    pageContext: types_1.OrthobulletsPageContextSchema,
    action: exports.OrthobulletsTopicActionSchema.optional(),
    progress: exports.OrthobulletsTopicProgressSchema,
    history: zod_1.z.array(exports.OrthobulletsTopicTutorTurnSchema).max(20).default([]),
    userMessage: zod_1.z.string().trim().min(1).max(2000).optional(),
});
exports.OrthobulletsTopicTutorResponseSchema = zod_1.z.object({
    responseId: zod_1.z.string().uuid(),
    message: zod_1.z.string().trim().min(1).max(1600),
    citedHeading: zod_1.z.string().trim().max(240).nullable().optional(),
    citedQuote: zod_1.z.string().trim().max(600).nullable().optional(),
    verdict: zod_1.z.enum(['correct', 'partial', 'incorrect']).nullable().optional(),
    clinicalWhyItMatters: zod_1.z.string().trim().max(600).nullable().optional(),
    followUpQuestion: zod_1.z.string().trim().max(400).nullable().optional(),
    conceptTag: zod_1.z.string().trim().max(160).nullable().optional(),
    conceptStatus: zod_1.z.enum(['missed', 'mastered']).nullable().optional(),
    sectionCompleted: zod_1.z.string().trim().max(240).nullable().optional(),
    tier: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3), zod_1.z.literal(4), zod_1.z.literal(5)]).default(1),
    insufficientContent: zod_1.z.boolean().default(false),
    suggestedChips: zod_1.z.array(zod_1.z.string().trim().min(1).max(80)).max(6).default([]),
    warnings: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(20).default([]),
    usage: zod_1.z
        .object({
        remainingToday: zod_1.z.number().int().min(0).nullable(),
        dailyCap: zod_1.z.number().int().min(0).nullable(),
        unlimited: zod_1.z.boolean(),
    })
        .optional(),
});
