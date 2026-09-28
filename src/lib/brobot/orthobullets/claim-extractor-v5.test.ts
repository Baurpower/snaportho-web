import assert from 'node:assert/strict';
import {
  applyCriticDecisions,
  applyQuestionReview,
  autoFlagsForDraft,
  claimTextSimilarity,
  detectNegativeFraming,
  extractClaimsV5,
  flagDistractorOverlap,
  flagWithinQuestionDuplicates,
  OB_CLAIMS_ALGORITHM_V5,
  parseCriticOutput,
  parseGeneratorOutput,
  parseQuestionReview,
  sourceContentHashV5,
  vignetteFlagsV5,
  type ObClaimDraftV5,
} from './claim-extractor-v5';

// --- generator parser ---

const generatorJson = {
  claims: [
    {
      text: 'The radial nerve is most commonly injured in fractures of the humeral shaft.',
      importance: 'primary',
      claim_type: 'anatomy',
      support: ['stem', 'correct_answer', 'explanation'],
      confidence: 0.96,
    },
    {
      text: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
      importance: 'secondary',
      claim_type: 'anatomy',
      support: ['explanation'],
      confidence: 0.9,
    },
  ],
};
const drafts = parseGeneratorOutput(generatorJson);
assert.ok(drafts);
assert.equal(drafts.length, 2);
assert.deepEqual(parseGeneratorOutput({ claims: [] }), []);
assert.equal(parseGeneratorOutput({ claims: [{ ...generatorJson.claims[0], claim_type: 'invented' }] }), null);
assert.equal(parseGeneratorOutput({ claims: [{ ...generatorJson.claims[0], text: 'too short' }] }), null);
assert.equal(parseGeneratorOutput({ claims: [{ ...generatorJson.claims[0], support: [] }] }), null);
assert.equal(parseGeneratorOutput({ claims: Array.from({ length: 9 }, () => generatorJson.claims[0]) }), null);
assert.equal(parseGeneratorOutput({}), null);

// --- critic parser ---

const checks = {
  supported: true, educational: true, atomic: true, selfContained: true, generalizable: true,
  qualifiersPreserved: true, negationPreserved: true, notFromDistractor: true, notDuplicate: true,
  scopeOk: true, flashcardWorthy: true,
};
const decision = (overrides: Record<string, unknown> = {}) => ({
  claim_index: 0, action: 'accept', text: '', split_texts: [], merge_with_index: -1,
  importance_override: 'keep', reason: 'clean atomic claim', checks,
  ...overrides,
});
const criticJson = { decisions: [decision(), decision({ claim_index: 1 })] };
const decisions = parseCriticOutput(criticJson, 2);
assert.ok(decisions);
assert.equal(decisions.length, 2);
assert.equal(parseCriticOutput({ decisions: [decision()] }, 2), null);
assert.equal(parseCriticOutput({ decisions: [decision(), decision()] }, 2), null);
assert.equal(parseCriticOutput({ decisions: [decision(), decision({ claim_index: 5 })] }, 2), null);
assert.equal(
  parseCriticOutput({ decisions: [decision({ action: 'split', split_texts: ['only one long enough statement here now'] })] }, 1),
  null,
);
assert.equal(
  parseCriticOutput({ decisions: [decision({ action: 'merge', merge_with_index: -1, text: '' })] }, 1),
  null,
);

// --- question-review parser ---

const reviewJson = {
  drop_indices: [],
  importance_changes: [{ index: 1, importance: 'primary' }],
  missing_concepts: ['ulnar nerve course'],
  over_extraction: false,
  secondary_overproduction: false,
  notes: 'Tight set.',
};
assert.ok(parseQuestionReview(reviewJson, 2));
assert.equal(parseQuestionReview({ ...reviewJson, drop_indices: [7] }, 2), null);
assert.equal(
  parseQuestionReview({ ...reviewJson, drop_indices: [0], importance_changes: [{ index: 0, importance: 'primary' }] }, 2),
  null,
);
assert.equal(parseQuestionReview({ ...reviewJson, missing_concepts: ['a', 'b', 'c', 'd', 'e', 'f'] }, 2), null);

// --- op application ---

const twoDrafts: ObClaimDraftV5[] = [
  { text: 'First claim about the radial nerve and humeral shaft fractures here.', importance: 'primary', claimType: 'anatomy', support: ['stem'], confidence: 0.9 },
  { text: 'Second claim about the spiral groove course of the radial nerve here.', importance: 'secondary', claimType: 'anatomy', support: ['explanation'], confidence: 0.9 },
];
const acceptAll = parseCriticOutput({ decisions: [decision(), decision({ claim_index: 1 })] }, 2)!;
{
  const applied = applyCriticDecisions(twoDrafts, acceptAll);
  assert.equal(applied.claims.length, 2);
  assert.equal(applied.origins.length, 2);
  assert.deepEqual(applied.errors, []);
}
{
  const rewrite = parseCriticOutput({ decisions: [
    decision({ action: 'rewrite', text: 'Rewritten first claim about the radial nerve Implausible filler words here.' }),
    decision({ claim_index: 1, action: 'remove', reason: 'unsupported trivia' }),
  ] }, 2)!;
  const applied = applyCriticDecisions(twoDrafts, rewrite);
  assert.equal(applied.claims.length, 1);
  assert.ok(applied.claims[0].text.startsWith('Rewritten first claim'));
  assert.equal(applied.origins[0].action, 'rewrite');
}
{
  const split = parseCriticOutput({ decisions: [
    decision({ action: 'split', split_texts: [
      'Split part one about the radial nerve injury pattern stated fully here.',
      'Split part two about the spiral groove anatomy stated fully here now.',
    ] }),
    decision({ claim_index: 1 }),
  ] }, 2)!;
  const applied = applyCriticDecisions(twoDrafts, split);
  assert.equal(applied.claims.length, 3);
  assert.equal(applied.origins[0].action, 'split');
  assert.equal(applied.origins[1].action, 'split');
}
{
  const merge = parseCriticOutput({ decisions: [
    decision({ action: 'merge', merge_with_index: 1, text: 'Merged best single claim about the radial nerve stated fully here.' }),
    decision({ claim_index: 1 }),
  ] }, 2)!;
  const applied = applyCriticDecisions(twoDrafts, merge);
  assert.equal(applied.claims.length, 1);
  assert.ok(applied.claims[0].text.startsWith('Merged best single'));
  assert.deepEqual(applied.errors, []);
}
{
  // Merge into a removed target is invalid: both claims survive, error recorded.
  const badMerge = parseCriticOutput({ decisions: [
    decision({ action: 'merge', merge_with_index: 1, text: 'Merged best single claim about the radial nerve stated fully here.' }),
    decision({ claim_index: 1, action: 'remove', reason: 'trivia' }),
  ] }, 2)!;
  const applied = applyCriticDecisions(twoDrafts, badMerge);
  assert.equal(applied.claims.length, 1);
  assert.ok(applied.errors.some((error) => error.startsWith('merge_into_unstable')));
}
{
  const selfMerge = parseCriticOutput({ decisions: [
    decision({ action: 'merge', merge_with_index: 0, text: 'Merged best single claim about the radial nerve stated fully here.' }),
  ] }, 1)!;
  const applied = applyCriticDecisions([twoDrafts[0]], selfMerge);
  assert.equal(applied.claims.length, 1);
  assert.ok(applied.errors.some((error) => error.startsWith('merge_self')));
}

// --- question-review application ---

{
  const review = parseQuestionReview({
    drop_indices: [1],
    importance_changes: [{ index: 0, importance: 'secondary' }],
    missing_concepts: [],
    over_extraction: true,
    secondary_overproduction: false,
    notes: 'Second claim was trivia.',
  }, 2)!;
  const finalized = applyQuestionReview(twoDrafts, review);
  assert.equal(finalized.claims.length, 1);
  assert.equal(finalized.claims[0].importance, 'secondary');
  assert.deepEqual(finalized.dropped, [1]);
}

// --- deterministic guards ---

assert.equal(detectNegativeFraming('Which of the following is NOT a risk factor for nonunion?'), true);
assert.equal(detectNegativeFraming('All of the following are true EXCEPT:'), true);
assert.equal(detectNegativeFraming('Which complication is least likely after this procedure?'), true);
assert.equal(detectNegativeFraming('NSAIDs are contraindicated in which setting?'), true);
assert.equal(detectNegativeFraming('Which nerve is most commonly injured in this fracture?'), false);
assert.equal(detectNegativeFraming('What is the most appropriate next step in management?'), false);

assert.deepEqual(
  flagDistractorOverlap({
    claimText: 'The median nerve is commonly injured in humeral shaft fractures.',
    incorrectChoiceTexts: ['Median nerve injury', 'Axillary nerve injury'],
    explanationText: 'The radial nerve is at risk in the spiral groove.',
  }),
  [0],
);
assert.deepEqual(
  flagDistractorOverlap({
    claimText: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
    incorrectChoiceTexts: ['Median nerve injury'],
    explanationText: 'The radial nerve travels in the spiral groove.',
  }),
  [],
);
// EXCEPT question: choice names the entity, explanation asserts the relationship -> excused.
assert.deepEqual(
  flagDistractorOverlap({
    claimText: 'Diabetes mellitus is a risk factor for surgical site infection after lumbar fusion.',
    incorrectChoiceTexts: ['Diabetes mellitus', 'Smoking', 'Obesity'],
    explanationText: 'Diabetes, smoking, and obesity all increase the risk of infection after spinal fusion.',
    allChoiceTexts: ['Diabetes mellitus', 'Smoking', 'Obesity', 'Young age'],
  }),
  [],
);

assert.ok(claimTextSimilarity(
  'Arthroplasty is preferred for displaced femoral neck fractures in elderly patients.',
  'Arthroplasty is preferred for displaced femoral neck fractures in older adults.',
) > 0.65);
assert.ok(claimTextSimilarity(
  'The radial nerve is at risk in humeral shaft fractures.',
  'Arthroplasty treats displaced femoral neck fractures.',
) < 0.3);
// Paraphrase dupes are the semantic critic's job: no deterministic flag.
assert.equal(flagWithinQuestionDuplicates([
  'Older patients with displaced femoral neck fractures are treated with arthroplasty.',
  'Arthroplasty is preferred for displaced femoral neck fractures in elderly patients.',
  'The radial nerve travels in the spiral groove.',
]).length, 0);
// Template siblings are distinct facts: no flag.
assert.equal(flagWithinQuestionDuplicates([
  'Diabetes mellitus is a risk factor for surgical site infection after lumbar fusion.',
  'Smoking is a risk factor for surgical site infection after lumbar fusion.',
  'Obesity is a risk factor for surgical site infection after lumbar fusion.',
]).length, 0);
// Near-verbatim repeat (generator glitch) flags.
assert.equal(flagWithinQuestionDuplicates([
  'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
  'The radial nerve travels in the spiral groove along the posterior humeral shaft!',
]).length, 1);

assert.deepEqual(vignetteFlagsV5('Displaced femoral neck fractures in older adults are treated with arthroplasty.'), []);
assert.deepEqual(
  vignetteFlagsV5('Posterior spinal fusion is considered for curves over 45 degrees in skeletally immature patients.'),
  [],
);
assert.ok(vignetteFlagsV5('In a 42-year-old male laborer, fixation is preferred for this fracture.').includes('age_vignette'));
assert.ok(vignetteFlagsV5('A 23-year-old football player presents with knee instability after pivoting.').length > 0);

assert.deepEqual(
  autoFlagsForDraft({
    claimText: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
    incorrectChoiceTexts: ['Median nerve'],
    explanationText: 'The radial nerve is in the spiral groove.',
  }),
  [],
);

assert.equal(
  sourceContentHashV5({
    stem: 'stem', answerChoices: [{ key: 'A', text: 'a' }], correctAnswer: 'a',
    explanationText: 'exp', topicHints: ['t'],
  }),
  sourceContentHashV5({
    stem: 'stem', answerChoices: [{ key: 'A', text: 'a' }], correctAnswer: 'a',
    explanationText: 'exp', topicHints: ['t'],
  }),
);

// --- runner with stub client (no network) ---

function stubClient(outputs: Array<string | null>) {
  let calls = 0;
  return {
    chat: {
      completions: {
        create: async () => {
          const content = outputs[Math.min(calls, outputs.length - 1)];
          calls += 1;
          if (content === null) throw new Error('model_down');
          return { choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
        },
      },
    },
  };
}

const packet = {
  stem: 'Which nerve is most commonly injured in fractures of the humeral shaft?',
  answerChoices: [
    { key: 'A', text: 'Median nerve' },
    { key: 'B', text: 'Radial nerve' },
  ],
  correctAnswer: 'Radial nerve',
  explanationText: 'The radial nerve travels in the spiral groove and is at risk.',
  topicHints: ['Humeral Shaft Fractures'],
};

{
  const result = await extractClaimsV5(packet, 'syn-1', {
    client: stubClient([
      JSON.stringify(generatorJson),
      JSON.stringify(criticJson),
      JSON.stringify({ ...reviewJson, importance_changes: [] }),
    ]) as never,
  });
  assert.equal(result.error, null);
  assert.equal(result.algorithmVersion, OB_CLAIMS_ALGORITHM_V5);
  assert.equal(result.claims.length, 2);
  assert.equal(result.models.generator.length > 0, true);
  assert.ok(result.rawOutputs.generator && result.rawOutputs.critic && result.rawOutputs.questionReview);
  assert.equal(result.usage.modelCalls, 3);
  assert.equal(result.negativeFraming, false);
  assert.deepEqual(result.claims[0].provenance.supportedBy, ['stem', 'correct_answer', 'explanation']);
}
{
  // Empty generator output is valid and skips the critic.
  const result = await extractClaimsV5(packet, 'syn-2', {
    client: stubClient([JSON.stringify({ claims: [] })]) as never,
  });
  assert.equal(result.error, null);
  assert.deepEqual(result.claims, []);
  assert.equal(result.usage.modelCalls, 1);
}
{
  // Generator failure preserves the error and raw outputs.
  const result = await extractClaimsV5(packet, 'syn-3', { client: stubClient([null]) as never });
  assert.equal(result.error, 'generator_call_failed');
  assert.deepEqual(result.claims, []);
}

// --- synthetic regression fixtures (packets only; model behavior judged in pilot) ---

const regressionPackets = [
  {
    id: 'syn-trauma-multi',
    expectGuards: { negativeFraming: false },
    packet: {
      stem: 'A 72-year-old woman falls and sustains a displaced femoral neck fracture. What is the preferred treatment?',
      answerChoices: [{ key: 'A', text: 'Cannulated screws' }, { key: 'B', text: 'Hemiarthroplasty' }],
      correctAnswer: 'Hemiarthroplasty',
      explanationText: 'Displaced femoral neck fractures in elderly patients are treated with arthroplasty because of high nonunion risk with fixation.',
      topicHints: ['Femoral Neck Fractures'],
    },
  },
  {
    id: 'syn-spine-except',
    expectGuards: { negativeFraming: true },
    packet: {
      stem: 'All of the following are red flags for spinal infection EXCEPT:',
      answerChoices: [{ key: 'A', text: 'Fever' }, { key: 'B', text: 'IV drug use' }, { key: 'C', text: 'Young age' }],
      correctAnswer: 'Young age',
      explanationText: 'Fever, IV drug use, and immunosuppression raise concern for spinal infection.',
      topicHints: ['Spine Infection'],
    },
  },
  {
    id: 'syn-image-insufficient',
    expectGuards: { negativeFraming: false },
    packet: {
      stem: 'Based on the radiograph shown, what is the diagnosis?',
      answerChoices: [{ key: 'A', text: 'Scaphoid fracture' }, { key: 'B', text: 'Lunate dislocation' }],
      correctAnswer: 'Scaphoid fracture',
      explanationText: null,
      topicHints: ['Scaphoid Fractures'],
    },
  },
];
for (const fixture of regressionPackets) {
  assert.equal(detectNegativeFraming(fixture.packet.stem), fixture.expectGuards.negativeFraming, fixture.id);
  assert.match(sourceContentHashV5(fixture.packet), /^[0-9a-f]{64}$/, fixture.id);
}

console.log('claim-extractor-v5.test.ts: all assertions passed');
