"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurriculumParseError = void 0;
exports.parseCurriculumStudyResponse = parseCurriculumStudyResponse;
const curriculum_types_1 = require("./curriculum-types");
class CurriculumParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CurriculumParseError';
    }
}
exports.CurriculumParseError = CurriculumParseError;
function extractJsonObject(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    if (trimmed.startsWith('{') && trimmed.endsWith('}'))
        return trimmed;
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first === -1 || last === -1 || first >= last)
        return null;
    return trimmed.slice(first, last + 1);
}
function parseJsonObject(raw) {
    const json = extractJsonObject(raw);
    if (!json)
        throw new CurriculumParseError('BroBot curriculum response did not contain JSON.');
    try {
        return JSON.parse(json);
    }
    catch {
        throw new CurriculumParseError('BroBot curriculum response was not valid JSON.');
    }
}
function coerceStringArray(value, max = 8) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, max);
}
function buildFallbackPayload(parsed, emphasis) {
    const bottomLine = typeof parsed.bottomLine === 'string' ? parsed.bottomLine.trim() : '';
    const whyCorrect = typeof parsed.whyCorrect === 'string' ? parsed.whyCorrect.trim() : '';
    const testedConcept = typeof parsed.testedConcept === 'string' ? parsed.testedConcept.trim() : '';
    const boardPearl = typeof parsed.boardPearl === 'string' ? parsed.boardPearl.trim() : '';
    const boardTrap = typeof parsed.boardTrap === 'string' ? parsed.boardTrap.trim() : '';
    const studyNext = coerceStringArray(parsed.studyNext, 5);
    const legacyBullets = [bottomLine, testedConcept, boardPearl, boardTrap, ...studyNext].filter(Boolean);
    const splitWhyCorrect = whyCorrect
        .split(/[;\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && s.length < 240);
    const fallbackBullets = [...legacyBullets, ...splitWhyCorrect].slice(0, 5);
    return {
        emphasis,
        oneSentenceTakeaway: bottomLine || fallbackBullets[0] || 'Key points from this page — see bullets below.',
        inThirtySeconds: fallbackBullets.slice(0, 4).length
            ? fallbackBullets.slice(0, 4)
            : ['Review the extracted page sections for high-yield points.'],
        mustKnow: fallbackBullets.length
            ? [{ title: 'Must Know', bullets: fallbackBullets.slice(0, 4) }]
            : [],
        clinicalPearls: boardPearl ? [boardPearl] : [],
        commonMistakes: boardTrap ? [boardTrap] : [],
        attendingQuestions: [],
        testableFacts: testedConcept ? [testedConcept] : [],
        miniQuiz: [],
        memoryHooks: [],
        suggestedFollowUps: [],
        nextReviewTopics: studyNext,
        learningObjectives: [],
        deepDive: splitWhyCorrect.slice(4, 8),
        fallbackBullets,
        parseError: 'Structured curriculum JSON did not match expected shape; compact fallback applied.',
        warnings: ['Response used compact fallback formatting.'],
    };
}
function parseCurriculumStudyResponse(input) {
    const parsed = parseJsonObject(input.raw);
    const strict = curriculum_types_1.CurriculumStudyResponseSchema.safeParse({
        ...parsed,
        responseKind: 'curriculum',
        explanationId: input.explanationId,
        emphasis: input.emphasis,
        usage: {
            remainingToday: input.remainingToday,
            dailyCap: input.dailyCap,
            unlimited: input.unlimited,
        },
    });
    if (strict.success) {
        return strict.data;
    }
    const fallback = buildFallbackPayload(parsed, input.emphasis);
    const recovered = curriculum_types_1.CurriculumStudyResponseSchema.safeParse({
        ...fallback,
        responseKind: 'curriculum',
        explanationId: input.explanationId,
        usage: {
            remainingToday: input.remainingToday,
            dailyCap: input.dailyCap,
            unlimited: input.unlimited,
        },
    });
    if (recovered.success) {
        return recovered.data;
    }
    throw new CurriculumParseError('BroBot curriculum response could not be parsed or recovered.');
}
