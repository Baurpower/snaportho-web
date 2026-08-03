"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurriculumPipelineError = void 0;
exports.curriculumErrorSummary = curriculumErrorSummary;
exports.isTransientCurriculumError = isTransientCurriculumError;
exports.isCurriculumModelUnavailableError = isCurriculumModelUnavailableError;
exports.withCurriculumRetry = withCurriculumRetry;
exports.buildPartialCurriculumResponse = buildPartialCurriculumResponse;
class CurriculumPipelineError extends Error {
    code;
    stage;
    cause;
    constructor(code, stage, message, cause) {
        super(message);
        this.code = code;
        this.stage = stage;
        this.cause = cause;
        this.name = "CurriculumPipelineError";
    }
}
exports.CurriculumPipelineError = CurriculumPipelineError;
function curriculumErrorSummary(error) {
    const candidate = error && typeof error === "object" ? error : null;
    const status = typeof candidate?.status === "number" ? candidate.status : null;
    const providerCode = typeof candidate?.code === "string" ? candidate.code : null;
    const message = error instanceof Error
        ? error.message
        : typeof candidate?.message === "string"
            ? candidate.message
            : "Unknown error";
    return { status, providerCode, message };
}
function isTransientCurriculumError(error) {
    const { status, providerCode, message } = curriculumErrorSummary(error);
    if (providerCode === "credit_balance_exhausted" ||
        /insufficient_quota|no credits remaining|credit balance/i.test(message))
        return false;
    if (status === 408 ||
        status === 409 ||
        status === 429 ||
        (status != null && status >= 500))
        return true;
    if (providerCode &&
        /^(rate_limit_exceeded|timeout|server_error|connection_error)$/i.test(providerCode))
        return true;
    return /timeout|timed out|rate limit|connection (?:reset|error)|temporarily unavailable|fetch failed/i.test(message);
}
function isCurriculumModelUnavailableError(error) {
    const { providerCode, message } = curriculumErrorSummary(error);
    return providerCode === "credit_balance_exhausted" ||
        /insufficient_quota|no credits remaining|credit balance|model .* (?:not found|unavailable)/i.test(message);
}
async function withCurriculumRetry(operation, options = {}) {
    const retries = options.retries ?? 2;
    const baseDelayMs = options.baseDelayMs ?? 250;
    const sleep = options.sleep ??
        ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    for (let attempt = 0;; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt >= retries || !isTransientCurriculumError(error))
                throw error;
            await sleep(baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 100));
        }
    }
}
function strings(value, max = 12) {
    return Array.isArray(value)
        ? value
            .filter((item) => typeof item === "string" && Boolean(item.trim()))
            .slice(0, max)
        : [];
}
/** Produce a valid, useful response when final synthesis is unavailable. */
function buildPartialCurriculumResponse(chunkResults, failedChunkCount) {
    const notes = chunkResults
        .map(({ result }) => result && typeof result === "object"
        ? result
        : null)
        .filter((result) => result != null);
    const takeaways = notes
        .map((note) => typeof note.oneSentenceTakeaway === "string"
        ? note.oneSentenceTakeaway.trim()
        : "")
        .filter(Boolean);
    const inThirtySeconds = notes
        .flatMap((note) => strings(note.inThirtySeconds, 5))
        .slice(0, 5);
    const mustKnow = notes
        .flatMap((note) => (Array.isArray(note.mustKnow) ? note.mustKnow : []))
        .slice(0, 3);
    return JSON.stringify({
        oneSentenceTakeaway: takeaways[0] ||
            inThirtySeconds[0] ||
            "Review the high-yield points recovered from this page.",
        inThirtySeconds: inThirtySeconds.length
            ? inThirtySeconds
            : takeaways.slice(0, 5),
        mustKnow,
        clinicalPearls: notes
            .flatMap((note) => strings(note.clinicalPearls))
            .slice(0, 8),
        commonMistakes: notes
            .flatMap((note) => strings(note.commonMistakes))
            .slice(0, 8),
        attendingQuestions: notes
            .flatMap((note) => Array.isArray(note.attendingQuestions) ? note.attendingQuestions : [])
            .slice(0, 6),
        testableFacts: notes
            .flatMap((note) => strings(note.testableFacts))
            .slice(0, 10),
        suggestedFollowUps: notes
            .flatMap((note) => strings(note.suggestedFollowUps))
            .slice(0, 8),
        warnings: [
            `Partial explanation recovered from ${notes.length} section group${notes.length === 1 ? "" : "s"}.`,
            ...(failedChunkCount
                ? [
                    `${failedChunkCount} section group${failedChunkCount === 1 ? "" : "s"} could not be processed.`,
                ]
                : []),
            "Final synthesis was unavailable; some duplication may remain.",
        ],
    });
}
