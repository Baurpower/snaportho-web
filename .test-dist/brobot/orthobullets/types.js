"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrthobulletsHintResponseSchema = exports.OrthobulletsChatResponseSchema = exports.OrthobulletsChatRequestSchema = exports.OrthobulletsChatTurnSchema = exports.OrthobulletsExplainResponseSchema = exports.OrthobulletsHintRequestSchema = exports.OrthobulletsExplainRequestSchema = exports.OrthobulletsPageContextSchema = void 0;
const zod_1 = require("zod");
const curriculum_types_1 = require("./curriculum-types");
const OrthobulletsChoiceSchema = zod_1.z.object({
    key: zod_1.z.string().trim().min(1).max(32).optional(),
    label: zod_1.z.string().trim().min(1).max(32).nullable().optional(),
    text: zod_1.z.string().trim().min(1).max(4000),
    isSelected: zod_1.z.boolean().nullable().optional(),
    isCorrect: zod_1.z.boolean().nullable().optional(),
});
const OrthobulletsPercentDistributionSchema = zod_1.z.object({
    answerKey: zod_1.z.string().trim().min(1).max(32).optional(),
    label: zod_1.z.string().trim().min(1).max(120).optional(),
    percent: zod_1.z.number().min(0).max(100).optional(),
});
const OrthobulletsLinkedConceptSchema = zod_1.z.object({
    label: zod_1.z.string().trim().min(1).max(240),
    href: zod_1.z.string().trim().max(2000).optional(),
    kind: zod_1.z.enum(['oite', 'card', 'topic']).optional(),
});
const OrthobulletsImageMetadataSchema = zod_1.z.object({
    src: zod_1.z.string().trim().max(2000).optional(),
    alt: zod_1.z.string().trim().max(500).optional(),
    caption: zod_1.z.string().trim().max(1000).nullable().optional(),
    width: zod_1.z.number().int().positive().optional(),
    height: zod_1.z.number().int().positive().optional(),
});
const OrthobulletsDebugSchema = zod_1.z.object({
    matchedSelectors: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).default({}),
    extractorVersion: zod_1.z.string().trim().min(1).max(64),
});
exports.OrthobulletsPageContextSchema = zod_1.z.object({
    source: zod_1.z.enum(['orthobullets', 'rock']).default('orthobullets'),
    provider: zod_1.z.enum(['orthobullets', 'rock']).default('orthobullets'),
    mode: zod_1.z.enum(['question', 'curriculum_content']).default('question'),
    pageUrl: zod_1.z.string().trim().url(),
    sourceUrl: zod_1.z.string().trim().url().optional(),
    pageKind: zod_1.z.string().trim().min(1).max(80).default('unknown'),
    questionId: zod_1.z.string().trim().min(1).max(64).nullable().optional(),
    topicId: zod_1.z.string().trim().min(1).max(64).nullable().optional(),
    title: zod_1.z.string().trim().min(1).max(300).nullable().optional(),
    breadcrumbs: zod_1.z.array(zod_1.z.string().trim().min(1).max(200)).max(12).default([]),
    authors: zod_1.z.array(zod_1.z.string().trim().min(1).max(200)).max(12).default([]).optional(),
    date: zod_1.z.string().trim().min(1).max(120).nullable().optional(),
    sectionHeadings: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(40).default([]).optional(),
    contentText: zod_1.z.string().trim().min(1).max(16000).nullable().optional(),
    contentMarkdown: zod_1.z.string().trim().min(1).max(16000).nullable().optional(),
    references: zod_1.z.array(zod_1.z.string().trim().min(1).max(1200)).max(40).default([]).optional(),
    referencesCount: zod_1.z.number().int().min(0).max(100).optional(),
    tablesCount: zod_1.z.number().int().min(0).max(50).optional(),
    contentSections: zod_1.z.array(zod_1.z.object({
        heading: zod_1.z.string().trim().min(1).max(240),
        text: zod_1.z.string().trim().min(1).max(4000),
    })).max(24).default([]).optional(),
    learningObjectives: zod_1.z.array(zod_1.z.string().trim().min(1).max(400)).max(20).default([]).optional(),
    tablesMarkdown: zod_1.z.array(zod_1.z.string().trim().min(1).max(2000)).max(8).default([]).optional(),
    stem: zod_1.z.string().trim().min(1).max(12000).optional(),
    answerChoices: zod_1.z.array(OrthobulletsChoiceSchema).max(12).default([]),
    selectedAnswerKey: zod_1.z.string().trim().min(1).max(32).nullable().optional(),
    correctAnswerKey: zod_1.z.string().trim().min(1).max(32).nullable().optional(),
    selectedAnswer: zod_1.z.string().trim().min(1).max(4000).nullable().optional(),
    correctAnswer: zod_1.z.string().trim().min(1).max(4000).nullable().optional(),
    percentDistribution: zod_1.z.array(OrthobulletsPercentDistributionSchema).max(12).default([]),
    explanationText: zod_1.z.string().trim().min(1).max(16000).nullable().optional(),
    explanation: zod_1.z.string().trim().min(1).max(16000).nullable().optional(),
    linkedConcepts: zod_1.z.array(OrthobulletsLinkedConceptSchema).max(20).default([]),
    images: zod_1.z.array(OrthobulletsImageMetadataSchema).max(20).default([]),
    raw: zod_1.z.object({
        providerSpecific: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    }).optional(),
    extractionWarnings: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(20).default([]),
    debug: OrthobulletsDebugSchema.optional(),
});
exports.OrthobulletsExplainRequestSchema = zod_1.z.object({
    pageContext: exports.OrthobulletsPageContextSchema,
    emphasis: curriculum_types_1.CurriculumExplainEmphasisSchema.optional(),
});
exports.OrthobulletsHintRequestSchema = zod_1.z.object({
    pageContext: exports.OrthobulletsPageContextSchema,
    hintLevel: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]),
    selectedAnswerKey: zod_1.z.string().trim().min(1).max(32).optional(),
});
exports.OrthobulletsExplainResponseSchema = zod_1.z.object({
    explanationId: zod_1.z.string().uuid(),
    // 1-2 sentence direct answer: the diagnosis/principle + which choice wins.
    bottomLine: zod_1.z.string().trim().min(1).max(400),
    // The single concept being tested, named concretely (not a vague topic).
    testedConcept: zod_1.z.string().trim().min(1).max(200),
    whyCorrect: zod_1.z.string().trim().min(1).max(2000),
    whyWrong: zod_1.z.array(zod_1.z.object({
        choiceKey: zod_1.z.string().trim().min(1).max(32).optional(),
        reason: zod_1.z.string().trim().min(1).max(600),
        // At most one distractor should be flagged true: the classic
        // board/OITE trap (the choice residents most often pick incorrectly).
        isClassicTrap: zod_1.z.boolean().optional(),
    })).max(12),
    boardTrap: zod_1.z.string().trim().min(1).max(500).optional(),
    // The single highest-yield, memorable teaching takeaway.
    boardPearl: zod_1.z.string().trim().min(1).max(500),
    studyNext: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(6).default([]),
    warnings: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(20).default([]),
    usage: zod_1.z.object({
        remainingToday: zod_1.z.number().int().min(0).nullable(),
        dailyCap: zod_1.z.number().int().min(0).nullable(),
        unlimited: zod_1.z.boolean(),
    }).optional(),
});
exports.OrthobulletsChatTurnSchema = zod_1.z.object({
    role: zod_1.z.enum(['user', 'assistant']),
    content: zod_1.z.string().trim().min(1).max(4000),
});
const OrthobulletsChatExplanationSchema = exports.OrthobulletsExplainResponseSchema.omit({
    explanationId: true,
    usage: true,
});
const CurriculumChatStudySchema = curriculum_types_1.CurriculumStudyResponseSchema.omit({
    explanationId: true,
    usage: true,
});
exports.OrthobulletsChatRequestSchema = zod_1.z.object({
    pageContext: exports.OrthobulletsPageContextSchema,
    explanation: OrthobulletsChatExplanationSchema.optional(),
    curriculumStudy: CurriculumChatStudySchema.optional(),
    emphasis: curriculum_types_1.CurriculumExplainEmphasisSchema.optional(),
    history: zod_1.z.array(exports.OrthobulletsChatTurnSchema).max(12).default([]),
    userMessage: zod_1.z.string().trim().min(1).max(1000),
}).superRefine((value, ctx) => {
    const hasQuestion = Boolean(value.explanation);
    const hasCurriculum = Boolean(value.curriculumStudy);
    if (hasQuestion === hasCurriculum) {
        ctx.addIssue({
            code: 'custom',
            message: 'Provide exactly one of explanation or curriculumStudy.',
            path: ['explanation'],
        });
    }
});
exports.OrthobulletsChatResponseSchema = zod_1.z.object({
    responseId: zod_1.z.string().uuid(),
    answer: zod_1.z.string().trim().min(1).max(2400),
    suggestedPrompts: zod_1.z.array(zod_1.z.string().trim().min(1).max(160)).max(4).default([]),
    warnings: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(20).default([]),
    usage: zod_1.z.object({
        remainingToday: zod_1.z.number().int().min(0).nullable(),
        dailyCap: zod_1.z.number().int().min(0).nullable(),
        unlimited: zod_1.z.boolean(),
    }).optional(),
});
exports.OrthobulletsHintResponseSchema = zod_1.z.object({
    hintId: zod_1.z.string().uuid(),
    hintLevel: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]),
    title: zod_1.z.string().trim().min(1).max(120),
    hint: zod_1.z.string().trim().min(1).max(800),
    avoidRevealingAnswer: zod_1.z.boolean(),
    nextActionLabel: zod_1.z.string().trim().min(1).max(80).optional(),
    warnings: zod_1.z.array(zod_1.z.string().trim().min(1).max(300)).max(20).default([]),
    usage: zod_1.z.object({
        remainingToday: zod_1.z.number().int().min(0).nullable(),
        dailyCap: zod_1.z.number().int().min(0).nullable(),
        unlimited: zod_1.z.boolean(),
    }).optional(),
});
