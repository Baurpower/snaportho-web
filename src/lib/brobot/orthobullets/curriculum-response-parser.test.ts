import assert from 'node:assert/strict';

import { parseCurriculumStudyResponse } from './curriculum-response-parser';

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

const parsed = parseCurriculumStudyResponse({
  raw: valid,
  explanationId: '00000000-0000-4000-8000-000000000099',
  emphasis: 'high_yield',
  remainingToday: 5,
  dailyCap: 10,
  unlimited: false,
});

assert.equal(parsed.responseKind, 'curriculum');
assert.equal(parsed.emphasis, 'high_yield');
assert.equal(parsed.inThirtySeconds.length, 3);
assert.ok(parsed.suggestedFollowUps.length >= 5);
assert.ok(parsed.suggestedFollowUps.some((chip) => /ester|amide/i.test(chip)));

const legacy = JSON.stringify({
  bottomLine: 'Local anesthetics block sodium channels.',
  testedConcept: 'Local anesthesia pharmacology',
  whyCorrect: 'Agents differ in duration; know LAST.; Ester metabolism is faster.',
  boardTrap: 'Confusing local with spinal anesthesia',
  boardPearl: 'Intralipid for severe LAST',
  studyNext: ['Regional blocks'],
  warnings: [],
});

const fallback = parseCurriculumStudyResponse({
  raw: legacy,
  explanationId: '00000000-0000-4000-8000-000000000098',
  emphasis: 'boards',
  remainingToday: null,
  dailyCap: null,
  unlimited: true,
});

assert.equal(fallback.responseKind, 'curriculum');
assert.ok(fallback.parseError);
assert.ok((fallback.fallbackBullets ?? []).length >= 3);
assert.ok(fallback.inThirtySeconds.length <= 4);

console.log('Curriculum response parser tests passed.');