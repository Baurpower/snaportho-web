import * as assert from 'node:assert/strict';

import { contentSignals, resolveCurriculumChatChips } from './curriculum-chips.js';
import type { OrthobulletsPageContext } from './types.js';

function baseContext(overrides: Partial<OrthobulletsPageContext> = {}): OrthobulletsPageContext {
  return {
    source: 'rock',
    provider: 'rock',
    mode: 'curriculum_content',
    pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=TEST',
    sourceUrl: 'https://rock.aaos.org/coursecontent.aspx?id=TEST',
    pageKind: 'curriculum_content',
    breadcrumbs: [],
    answerChoices: [],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    extractionWarnings: [],
    ...overrides,
  };
}

const localAnesthesiaStudy = {
  suggestedFollowUps: [
    'Why do esters and amides have different allergy risks?',
    'When is epinephrine helpful versus risky in local anesthesia?',
    'What should I know about LAST before injecting local?',
    'What makes bupivacaine more dangerous than lidocaine?',
    'How does periarticular injection work in total joint arthroplasty?',
  ],
};

const localContext = baseContext({
  title: 'Local Anesthesia',
  contentText: 'Lidocaine and bupivacaine with epinephrine. LAST and ester vs amide metabolism.',
  tablesCount: 1,
});

const localChips = resolveCurriculumChatChips(localContext, localAnesthesiaStudy);

assert.ok(localChips.length <= 8);
assert.ok(localChips.length >= 5);
assert.ok(localChips.some((chip) => /ester|amide/i.test(chip)));
assert.ok(localChips.some((chip) => /epinephrine/i.test(chip)));
assert.ok(localChips.some((chip) => /LAST/i.test(chip)));
assert.equal(localChips.includes('Teach me like an MS3'), false);
assert.equal(localChips.includes('Make Anki cards'), false);
assert.equal(localChips.includes('Quiz me'), false);
assert.equal(localChips.includes('Give me a 60-sec review'), false);

const pharmacologyOnly = resolveCurriculumChatChips(localContext, null);
assert.ok(pharmacologyOnly.includes('Compare the drugs'));
assert.equal(pharmacologyOnly.includes('How do I recognize/manage this?'), false);
assert.equal(pharmacologyOnly.includes('Show key anatomy'), false);

const procedureContext = baseContext({
  title: 'Carpal Tunnel Release',
  contentText: 'Surgical procedure and intraoperative positioning for carpal tunnel.',
});
const procedureSignals = contentSignals(procedureContext);
assert.equal(procedureSignals.procedure, true);
const procedureChips = resolveCurriculumChatChips(procedureContext, null);
assert.ok(procedureChips.includes('How does this matter in the OR?'));
assert.ok(!procedureChips.includes('What anatomy matters most here?') || procedureChips.length <= 8);

const references = resolveCurriculumChatChips(
  baseContext({
    referencesCount: 4,
    references: ['Ref 1', 'Ref 2', 'Ref 3'],
    contentText: 'Recommended reading list for trauma references.',
  }),
  null
);
assert.ok(references.includes('What do these references suggest?'));
assert.ok(references.length <= 8);

const complication = resolveCurriculumChatChips(
  baseContext({
    contentText: 'Recognize compartment syndrome toxicity and nerve injury complications.',
  }),
  null
);
assert.ok(complication.includes('What are the danger signs?'));

console.log('Curriculum chips tests passed.');