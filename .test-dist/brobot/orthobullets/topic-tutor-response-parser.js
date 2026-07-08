"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicTutorParseError = void 0;
exports.parseTopicTutorResponse = parseTopicTutorResponse;
const topic_tutor_types_1 = require("./topic-tutor-types");
class TopicTutorParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TopicTutorParseError';
    }
}
exports.TopicTutorParseError = TopicTutorParseError;
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
    if (!json) {
        throw new TopicTutorParseError('BroBot topic tutor response did not contain JSON.');
    }
    try {
        return JSON.parse(json);
    }
    catch {
        throw new TopicTutorParseError('BroBot topic tutor response was not valid JSON.');
    }
}
function parseTopicTutorResponse(input) {
    const parsed = parseJsonObject(input.raw);
    try {
        return topic_tutor_types_1.OrthobulletsTopicTutorResponseSchema.parse({
            ...parsed,
            responseId: input.responseId,
            usage: {
                remainingToday: input.remainingToday,
                dailyCap: input.dailyCap,
                unlimited: input.unlimited,
            },
        });
    }
    catch {
        throw new TopicTutorParseError('BroBot topic tutor response did not match the expected shape.');
    }
}
