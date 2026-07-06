"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const curriculum_response_parser_1 = require("./curriculum-response-parser");
const valid = JSON.stringify({
    oneSentenceTakeaway: 'Know sodium channel blockade basics.',
    inThirtySeconds: ['Na+ blockade', 'Ester vs amide', 'LAST signs'],
    mustKnow: [{ title: 'Mechanism', bullets: ['Na+ channel blockade'] }],
    clinicalPearls: [],
    commonMistakes: ['Mixing up local vs regional'],
    attendingQuestions: [],
    testableFacts: ['LAST treatment'],
    miniQuiz: [],
    memoryHooks: [],
    suggestedFollowUps: [
        'Why do esters and amides have different allergy risks?',
        'When is epinephrine helpful versus risky in local anesthesia?',
        'What should I know about LAST before injecting local?',
        'What makes bupivacaine more dangerous than lidocaine?',
        'How does periarticular injection work in total joint arthroplasty?',
    ],
    nextReviewTopics: [],
    learningObjectives: [],
    deepDive: [],
    warnings: [],
});
const parsed = (0, curriculum_response_parser_1.parseCurriculumStudyResponse)({
    raw: valid,
    explanationId: '00000000-0000-4000-8000-000000000099',
    emphasis: 'high_yield',
    remainingToday: 5,
    dailyCap: 10,
    unlimited: false,
});
strict_1.default.equal(parsed.responseKind, 'curriculum');
strict_1.default.equal(parsed.emphasis, 'high_yield');
strict_1.default.equal(parsed.inThirtySeconds.length, 3);
strict_1.default.ok(parsed.suggestedFollowUps.length >= 5);
strict_1.default.ok(parsed.suggestedFollowUps.some((chip) => /ester|amide/i.test(chip)));
const legacy = JSON.stringify({
    bottomLine: 'Local anesthetics block sodium channels.',
    testedConcept: 'Local anesthesia pharmacology',
    whyCorrect: 'Agents differ in duration; know LAST.; Ester metabolism is faster.',
    boardTrap: 'Confusing local with spinal anesthesia',
    boardPearl: 'Intralipid for severe LAST',
    studyNext: ['Regional blocks'],
    warnings: [],
});
const fallback = (0, curriculum_response_parser_1.parseCurriculumStudyResponse)({
    raw: legacy,
    explanationId: '00000000-0000-4000-8000-000000000098',
    emphasis: 'boards',
    remainingToday: null,
    dailyCap: null,
    unlimited: true,
});
strict_1.default.equal(fallback.responseKind, 'curriculum');
strict_1.default.ok(fallback.parseError);
strict_1.default.ok((fallback.fallbackBullets ?? []).length >= 3);
strict_1.default.ok(fallback.inThirtySeconds.length <= 4);
console.log('Curriculum response parser tests passed.');
