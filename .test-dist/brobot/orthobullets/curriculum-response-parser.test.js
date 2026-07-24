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
// Salvage: curriculum-shaped JSON with limit violations must NOT collapse to
// the generic fallback shell (the ROCK "Explain" regression).
const longBullet = 'The lateral ischial cut passes near the sciatic nerve and should not be carried too posterior or lateral because '.repeat(4);
const nearMiss = JSON.stringify({
    oneSentenceTakeaway: 'Periacetabular osteotomy repositions the acetabulum through four cuts while protecting the sciatic and obturator nerves.',
    inThirtySeconds: [longBullet, 'Superior ramus cut is made medial to the iliopectineal eminence.', ''],
    mustKnow: [
        { title: 'Nerves at risk', bullets: [longBullet, 'Obturator nerve protected with circumferential retractors.'] },
        { title: 'Empty group dropped', bullets: [] },
    ],
    clinicalPearls: ['Confirm fragment mobility with a Schanz pin before reduction.'],
    commonMistakes: [longBullet],
    attendingQuestions: [
        { question: 'Which cut risks the sciatic nerve?', answer: 'The lateral ischial pass.', difficulty: 'PGY2' },
        { question: 'Missing answer dropped', answer: '', difficulty: 'MS3' },
    ],
    testableFacts: [],
    suggestedFollowUps: ['Why is the 50-degree oblique view used for the ischial cut?'],
    warnings: [],
});
const salvaged = (0, curriculum_response_parser_1.parseCurriculumStudyResponse)({
    raw: nearMiss,
    explanationId: '00000000-0000-4000-8000-000000000097',
    emphasis: 'or',
    remainingToday: 3,
    dailyCap: 10,
    unlimited: false,
});
strict_1.default.equal(salvaged.responseKind, 'curriculum');
strict_1.default.ok(!salvaged.parseError, 'salvaged responses must not carry the scary parse-error note');
strict_1.default.ok(salvaged.oneSentenceTakeaway.includes('Periacetabular'));
strict_1.default.ok(salvaged.inThirtySeconds.length >= 2, 'real bullets survive');
strict_1.default.ok(salvaged.inThirtySeconds.every((b) => b.length <= 200), 'bullets truncated to limit');
strict_1.default.equal(salvaged.mustKnow.length, 1, 'empty group dropped');
strict_1.default.equal(salvaged.attendingQuestions.length, 1, 'incomplete question dropped');
strict_1.default.equal(salvaged.attendingQuestions[0].difficulty, 'PGY2+', 'difficulty coerced to enum');
strict_1.default.ok(salvaged.warnings.some((w) => /trimmed/i.test(w)));
// Markdown-fenced JSON still parses.
const fenced = '```json\n' + valid + '\n```';
const fromFence = (0, curriculum_response_parser_1.parseCurriculumStudyResponse)({
    raw: fenced,
    explanationId: '00000000-0000-4000-8000-000000000096',
    emphasis: 'high_yield',
    remainingToday: 1,
    dailyCap: 10,
    unlimited: false,
});
strict_1.default.equal(fromFence.oneSentenceTakeaway, 'Know sodium channel blockade basics.');
console.log('Curriculum response parser tests passed.');
