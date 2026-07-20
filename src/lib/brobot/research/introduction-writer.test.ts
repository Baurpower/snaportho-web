import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_INTRODUCTION_INPUTS, IntroductionInputsSchema, countWords, introductionLengthStatus, introductionWriterPrompt } from './introduction-writer';

const valid = { ...EMPTY_INTRODUCTION_INPUTS, researchObjective: 'Compare outcomes after two treatments.', studyDesign: 'Retrospective cohort', primaryOutcome: 'Revision surgery', literatureReview: 'Study A reported short follow-up [paper-a].' };

test('validates the evidence-backed minimum input', () => {
  assert.equal(IntroductionInputsSchema.safeParse(valid).success, true);
  assert.equal(IntroductionInputsSchema.safeParse({ ...valid, literatureReview: '' }).success, false);
});

test('revision modes require the relevant draft', () => {
  assert.equal(IntroductionInputsSchema.safeParse({ ...valid, revisionMode: 'line_by_line' }).success, false);
  assert.equal(IntroductionInputsSchema.safeParse({ ...valid, revisionMode: 'compare_versions', existingDraft: 'A' }).success, false);
});

test('counts words and reports journal length guidance', () => {
  assert.equal(countWords(' one  two\nthree '), 3);
  assert.equal(introductionLengthStatus('one two', 3, 5).status, 'too_short');
  assert.equal(introductionLengthStatus('one two three', 3, 5).status, 'on_target');
});

test('prompt prohibits fabricated evidence and separates teaching', () => {
  const prompt = introductionWriterPrompt(valid);
  assert.match(prompt, /Never invent prevalence, effect sizes, findings, citations/);
  assert.match(prompt, /Keep educational commentary out of manuscript text/);
  assert.match(prompt, /exactly four manuscript paragraphs/);
});
