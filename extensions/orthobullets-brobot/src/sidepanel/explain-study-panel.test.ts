import * as assert from 'node:assert/strict';

import {
  hasGiantParagraphCards,
  renderCurriculumChatChips,
  renderCurriculumStudyPanel,
} from './explain-study-panel.js';
import type { CurriculumStudyResponse, OrthobulletsPageContext } from '../shared/types.js';

const sampleStudy: CurriculumStudyResponse = {
  responseKind: 'curriculum',
  explanationId: '00000000-0000-4000-8000-000000000001',
  emphasis: 'high_yield',
  oneSentenceTakeaway: 'Local anesthetics block sodium channels; know ester vs amide and LAST.',
  inThirtySeconds: [
    'Sodium channel blockade stops impulse propagation.',
    'Esters vs amides differ in metabolism.',
    'LAST presents with neuro then cardio toxicity.',
  ],
  mustKnow: [{ title: 'Core mechanism', bullets: ['Voltage-gated Na+ blockade', 'Onset/duration varies by agent'] }],
  clinicalPearls: ['Aspirate before injection'],
  commonMistakes: ['Confusing local with regional/neuraxial anesthesia'],
  attendingQuestions: [],
  testableFacts: ['LAST treatment includes intralipid when severe'],
  miniQuiz: [],
  memoryHooks: ['LAST = Lipid rescue'],
  suggestedFollowUps: [
    'Why do esters and amides have different allergy risks?',
    'What should I know about LAST before injecting local?',
  ],
  nextReviewTopics: ['Regional anesthesia'],
  learningObjectives: [{ objective: 'Recognize LAST', status: 'covered' }],
  deepDive: ['Buffering may reduce injection pain'],
  warnings: ['Sparse source on dosing details'],
};

const pageContext: OrthobulletsPageContext = {
  source: 'rock',
  provider: 'rock',
  mode: 'curriculum_content',
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=6002116',
  sourceUrl: 'https://rock.aaos.org/coursecontent.aspx?id=6002116',
  pageKind: 'curriculum_content',
  title: 'Local Anesthesia',
  breadcrumbs: ['General Principles', 'Local Anesthesia'],
  learningObjectives: ['Recognize LAST'],
  tablesCount: 1,
  answerChoices: [],
  percentDistribution: [],
  linkedConcepts: [],
  images: [],
  extractionWarnings: [],
};

const html = renderCurriculumStudyPanel(sampleStudy, pageContext);

assert.match(html, /In 30 Seconds/);
assert.match(html, /Must Know/);
assert.match(html, /Common Mistakes/);
assert.match(html, /One-sentence takeaway/);
assert.match(html, /data-emphasis-tab="boards"/);
assert.doesNotMatch(html, /Learning objectives/);
assert.doesNotMatch(html, /Deep Dive/);
assert.doesNotMatch(html, /Next review topics/);
assert.doesNotMatch(html, /Quiz me/);
assert.doesNotMatch(html, /Make cards/);
assert.doesNotMatch(html, /Explain simpler/);
assert.doesNotMatch(html, /data-study-action/);
assert.equal(hasGiantParagraphCards(html), false);

const chipHtml = renderCurriculumChatChips(sampleStudy.suggestedFollowUps);
assert.match(chipHtml, /data-prompt-index="0"/);
assert.match(chipHtml, /esters and amides/i);

const legacyDense = `<section>${'<p style="margin:0;line-height:1.55;">Long paragraph</p>'.repeat(4)}</section>`;
assert.equal(hasGiantParagraphCards(legacyDense), true);

console.log('Explain study panel renderer tests passed.');