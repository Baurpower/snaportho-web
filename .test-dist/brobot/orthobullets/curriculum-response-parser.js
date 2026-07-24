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
function truncate(value, max) {
    const trimmed = value.trim();
    return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
function coerceBulletArray(value, maxItems, maxChars) {
    return coerceStringArray(value, maxItems).map((item) => truncate(item, maxChars));
}
function coerceDifficulty(value) {
    const raw = typeof value === 'string' ? value.toUpperCase() : '';
    if (raw.includes('MS'))
        return 'MS3';
    if (raw.includes('PGY1') || raw.includes('PGY-1'))
        return 'PGY1';
    return 'PGY2+';
}
/**
 * Coerce a near-miss curriculum response into the strict shape instead of
 * discarding it. LLMs routinely exceed per-string char limits or bend the
 * difficulty enum; one long bullet must not reduce the whole page to the
 * generic fallback shell.
 */
function salvageCurriculumPayload(parsed, emphasis) {
    const oneSentenceTakeaway = typeof parsed.oneSentenceTakeaway === 'string' ? truncate(parsed.oneSentenceTakeaway, 280) : '';
    const inThirtySeconds = coerceBulletArray(parsed.inThirtySeconds, 6, 200);
    const mustKnow = (Array.isArray(parsed.mustKnow) ? parsed.mustKnow : [])
        .filter((group) => Boolean(group) && typeof group === 'object')
        .map((group) => ({
        title: typeof group.title === 'string' ? truncate(group.title, 120) : '',
        bullets: coerceBulletArray(group.bullets, 8, 240),
    }))
        .filter((group) => group.title && group.bullets.length > 0)
        .slice(0, 6);
    const attendingQuestions = (Array.isArray(parsed.attendingQuestions) ? parsed.attendingQuestions : [])
        .filter((item) => Boolean(item) && typeof item === 'object')
        .map((item) => ({
        question: typeof item.question === 'string' ? truncate(item.question, 240) : '',
        answer: typeof item.answer === 'string' ? truncate(item.answer, 400) : '',
        difficulty: coerceDifficulty(item.difficulty),
    }))
        .filter((item) => item.question && item.answer)
        .slice(0, 6);
    // No recognizable curriculum content at all — let the legacy fallback try.
    if (!oneSentenceTakeaway && inThirtySeconds.length === 0 && mustKnow.length === 0) {
        return null;
    }
    const firstBullets = inThirtySeconds.length ? inThirtySeconds : mustKnow[0]?.bullets ?? [];
    return {
        emphasis,
        oneSentenceTakeaway: oneSentenceTakeaway || firstBullets[0] || 'Key points from this page — see bullets below.',
        inThirtySeconds: firstBullets.length ? firstBullets.slice(0, 6) : [oneSentenceTakeaway].filter(Boolean),
        mustKnow,
        clinicalPearls: coerceBulletArray(parsed.clinicalPearls, 8, 240),
        commonMistakes: coerceBulletArray(parsed.commonMistakes, 8, 240),
        attendingQuestions,
        testableFacts: coerceBulletArray(parsed.testableFacts, 10, 240),
        miniQuiz: [],
        memoryHooks: coerceBulletArray(parsed.memoryHooks, 6, 240),
        suggestedFollowUps: coerceBulletArray(parsed.suggestedFollowUps, 8, 200),
        nextReviewTopics: coerceBulletArray(parsed.nextReviewTopics, 6, 160),
        learningObjectives: [],
        deepDive: coerceBulletArray(parsed.deepDive, 8, 300),
        warnings: ['Some fields were trimmed to fit display limits.'],
    };
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
    // Surface WHY strict parsing failed — previously this was silent, which made
    // every fallback look like an extraction problem.
    console.warn('[brobot-curriculum] strict_parse_failed', {
        explanationId: input.explanationId,
        issues: strict.error.issues.slice(0, 10).map((issue) => ({
            path: issue.path.map(String).join('.'),
            code: issue.code,
            message: issue.message,
        })),
    });
    const salvaged = salvageCurriculumPayload(parsed, input.emphasis);
    if (salvaged) {
        const recoveredCurriculum = curriculum_types_1.CurriculumStudyResponseSchema.safeParse({
            ...salvaged,
            responseKind: 'curriculum',
            explanationId: input.explanationId,
            usage: {
                remainingToday: input.remainingToday,
                dailyCap: input.dailyCap,
                unlimited: input.unlimited,
            },
        });
        if (recoveredCurriculum.success) {
            return recoveredCurriculum.data;
        }
        console.warn('[brobot-curriculum] salvage_parse_failed', {
            explanationId: input.explanationId,
            issues: recoveredCurriculum.error.issues.slice(0, 10).map((issue) => ({
                path: issue.path.map(String).join('.'),
                code: issue.code,
                message: issue.message,
            })),
        });
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
