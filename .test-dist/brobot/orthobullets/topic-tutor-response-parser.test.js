"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const topic_tutor_response_parser_1 = require("./topic-tutor-response-parser");
const valid = JSON.stringify({
    message: 'Not quite — the page says nondisplaced femoral neck fractures in young patients get urgent fixation. What is the surgical urgency reason?',
    citedHeading: 'Treatment',
    citedQuote: 'Urgent reduction and fixation to minimize risk of avascular necrosis.',
    verdict: 'incorrect',
    clinicalWhyItMatters: 'Delays increase AVN risk in young patients with intact blood supply.',
    followUpQuestion: 'Why does timing matter more in young patients than elderly patients?',
    conceptTag: 'Femoral neck fracture urgency in young patients',
    conceptStatus: 'missed',
    sectionCompleted: null,
    tier: 3,
    insufficientContent: false,
    suggestedChips: ['Show board traps', 'What would an attending ask?'],
    warnings: [],
});
const parsed = (0, topic_tutor_response_parser_1.parseTopicTutorResponse)({
    raw: valid,
    responseId: '00000000-0000-4000-8000-000000000001',
    remainingToday: 4,
    dailyCap: 10,
    unlimited: false,
});
strict_1.default.equal(parsed.verdict, 'incorrect');
strict_1.default.equal(parsed.conceptStatus, 'missed');
strict_1.default.equal(parsed.tier, 3);
strict_1.default.equal(parsed.citedHeading, 'Treatment');
strict_1.default.ok(parsed.suggestedChips.length === 2);
strict_1.default.equal(parsed.usage?.remainingToday, 4);
strict_1.default.throws(() => {
    (0, topic_tutor_response_parser_1.parseTopicTutorResponse)({
        raw: 'not json at all',
        responseId: '00000000-0000-4000-8000-000000000002',
        remainingToday: null,
        dailyCap: null,
        unlimited: true,
    });
}, topic_tutor_response_parser_1.TopicTutorParseError);
console.log('topic-tutor-response-parser.test.ts passed');
