import assert from 'node:assert/strict';
import { isObProdExtraction } from './claim-extraction-contract-v1';
import { runProductionExtraction } from './claim-review-pipeline';
import { deterministicSamplingParams } from './openai-model-compat';

assert.deepEqual(deterministicSamplingParams('gpt-5-nano'), { reasoning_effort: 'low' });
assert.deepEqual(deterministicSamplingParams('GPT-5.1'), { reasoning_effort: 'low' });
assert.deepEqual(deterministicSamplingParams('gpt-4o'), { temperature: 0 });

const PACKET = {
  stem: 'Which nerve is most commonly injured in fractures of the humeral shaft?',
  answerChoices: [{ key: 'A', text: 'Median nerve' }, { key: 'B', text: 'Radial nerve' }],
  correctAnswer: 'Radial nerve',
  explanationText: 'The radial nerve travels in the spiral groove and is at risk.',
  topicHints: ['Humeral Shaft Fractures'],
};
const SOURCE = {
  provider: 'orthobullets' as const,
  nativeQuestionId: 'syn-1',
  registryQuestionId: null,
  sourceHash: 'a'.repeat(64),
  reviewLocator: 'https://www.orthobullets.com/testview?qid=syn-1',
};
const MODELS = { generator: 'g', reviewer: 'r', coverage: 'c', repair: 'p', validator: 'v' };

type Scripted = string | Error | { refusal: string } | null;
function stubClient(outputs: Scripted[]) {
  let calls = 0;
  return {
    calls: () => calls,
    chat: {
      completions: {
        create: async () => {
          const output = outputs[Math.min(calls, outputs.length - 1)];
          calls += 1;
          if (output instanceof Error) throw output;
          if (output !== null && typeof output === 'object') {
            return { choices: [{ message: { content: null, refusal: output.refusal } }], usage: null };
          }
          return {
            choices: [{ message: { content: output } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          };
        },
      },
    },
  };
}

const DRAFT_A = 'The radial nerve is most commonly injured in fractures of the humeral shaft.';
const DRAFT_B = 'The radial nerve travels in the spiral groove along the posterior humeral shaft.';
const QUALIFIERS = {
  anatomy: '', age_group: '', setting: '', severity: '', laterality: '', procedure: '', contraindication: '',
};

const generatorTwo = JSON.stringify({
  claims: [
    { text: DRAFT_A, importance: 'primary', claim_type: 'anatomy', qualifiers: QUALIFIERS, support: ['stem', 'correct_answer'], confidence: 0.9 },
    { text: DRAFT_B, importance: 'secondary', claim_type: 'anatomy', qualifiers: { ...QUALIFIERS, anatomy: 'humeral shaft' }, support: ['explanation'], confidence: 0.8 },
  ],
});
const reviewGood = JSON.stringify({
  judgments: [
    { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
    { claim_index: 1, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
  ],
});
const coverageComplete = JSON.stringify({
  verdict: 'complete', notes: 'tight', missing_concepts: [], drop_indices: [], importance_changes: [],
});
const validatorAccept = JSON.stringify({ verdict: 'accept', reason: 'independent pass' });

// 1. Full accept path.
{
  const client = stubClient([generatorTwo, reviewGood, coverageComplete, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, {
    client: client as never, models: MODELS, now: () => '2026-09-28T00:00:00.000Z',
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'accepted');
  assert.equal(result.extraction.candidates.filter((c) => c.accepted).length, 2);
  assert.equal(result.extraction.usage.generator.modelCalls, 1);
  assert.equal(result.extraction.usage.validator.modelCalls, 1);
  assert.equal(isObProdExtraction(result.extraction), true);
  assert.match(result.extraction.attemptId, /^[0-9a-f-]{36}$/);
}

// 2. Rewrite repair then accept (repair history recorded).
{
  const review = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'rewrite', quality_reason: 'scope', importance_override: 'keep' },
      { claim_index: 1, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
    ],
  });
  const repair = JSON.stringify({ repaired: [{ claim_index: 0, texts: [DRAFT_A] }] });
  const rereview = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'fixed', importance_override: 'keep' },
    ],
  });
  const client = stubClient([generatorTwo, review, coverageComplete, repair, rereview, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'accepted');
  assert.equal(result.extraction.candidates[0].repairs.length, 1);
  assert.equal(result.extraction.candidates[0].repairs[0].action, 'rewrite');
  assert.equal(isObProdExtraction(result.extraction), true);
}

// 3. Split repair produces children.
{
  const generator = JSON.stringify({
    claims: [{ text: DRAFT_A, importance: 'primary', claim_type: 'anatomy', qualifiers: QUALIFIERS, support: ['stem'], confidence: 0.9 }],
  });
  const review = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'split', quality_reason: 'two facts', importance_override: 'keep' },
    ],
  });
  const repair = JSON.stringify({ repaired: [{ claim_index: 0, texts: [DRAFT_A, DRAFT_B] }] });
  const rereview = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
      { claim_index: 1, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
    ],
  });
  const coverage = JSON.stringify({
    verdict: 'complete', notes: '', missing_concepts: [], drop_indices: [], importance_changes: [],
  });
  const client = stubClient([generator, review, coverage, repair, rereview, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'accepted');
  assert.equal(result.extraction.candidates.length, 2);
  assert.ok(result.extraction.candidates.every((c) => c.accepted));
}

// 4. Still bad after the single repair: unresolved (no second repair).
{
  const generator = JSON.stringify({
    claims: [{ text: DRAFT_A, importance: 'primary', claim_type: 'anatomy', qualifiers: QUALIFIERS, support: ['stem'], confidence: 0.9 }],
  });
  const review = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'rewrite', quality_reason: 'scope', importance_override: 'keep' },
    ],
  });
  const repair = JSON.stringify({ repaired: [{ claim_index: 0, texts: [DRAFT_A] }] });
  const rereview = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'rewrite', quality_reason: 'still bad', importance_override: 'keep' },
    ],
  });
  const client = stubClient([generator, review, coverageComplete, repair, rereview, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'ai_review_unresolved');
  assert.equal(result.extraction.candidates.filter((c) => c.accepted).length, 0);
  assert.deepEqual(result.extraction.diagnostics, ['review_unresolved']);
  assert.equal(isObProdExtraction(result.extraction), true);
}

// 5. Ambiguous factual: unresolved, never forced.
{
  const review = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'ambiguous', factual_reason: 'unsettled', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
      { claim_index: 1, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
    ],
  });
  const client = stubClient([generatorTwo, review, coverageComplete, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'ai_review_unresolved');
}

// 6. Unsupported draft drops cleanly; survivors still accept.
{
  const review = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'unsupported', factual_reason: 'absent', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
      { claim_index: 1, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
    ],
  });
  const coverage = JSON.stringify({
    verdict: 'complete', notes: '', missing_concepts: [], drop_indices: [], importance_changes: [],
  });
  const client = stubClient([generatorTwo, review, coverage, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'accepted');
  assert.equal(result.extraction.candidates.length, 2);
  assert.equal(result.extraction.candidates.filter((c) => c.accepted).length, 1);
  assert.equal(isObProdExtraction(result.extraction), true);
}

// 7. Missing major concept: unresolved.
{
  const coverage = JSON.stringify({
    verdict: 'missing_major_concept', notes: 'gap', missing_concepts: ['nerve course'],
    drop_indices: [], importance_changes: [],
  });
  const client = stubClient([generatorTwo, reviewGood, coverage, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'ai_review_unresolved');
}

// 8. Overextracted with drops: pruned then accepted.
{
  const coverage = JSON.stringify({
    verdict: 'overextracted', notes: 'trivia', missing_concepts: [],
    drop_indices: [1], importance_changes: [],
  });
  const client = stubClient([generatorTwo, reviewGood, coverage, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'accepted');
  assert.equal(result.extraction.candidates.filter((c) => c.accepted).length, 1);
  assert.equal(isObProdExtraction(result.extraction), true);
  // Residual verdict describes the persisted post-drop set; original preserved.
  assert.equal(result.extraction.coverage.verdict, 'complete');
  assert.match(result.extraction.coverage.notes, /coverage overextracted; dropped survivor indices 1/);
  assert.equal(result.extraction.candidates.find((c) => !c.accepted)?.validator.reason, 'dropped:coverage_drop');
}

// 8b. Internally conflicting with drops: pruned then accepted, contract-valid.
{
  const coverage = JSON.stringify({
    verdict: 'internally_conflicting', notes: 'clash', missing_concepts: [],
    drop_indices: [1], importance_changes: [],
  });
  const client = stubClient([generatorTwo, reviewGood, coverage, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'accepted');
  assert.equal(result.extraction.candidates.filter((c) => c.accepted).length, 1);
  assert.equal(isObProdExtraction(result.extraction), true);
  assert.equal(result.extraction.coverage.verdict, 'complete');
  assert.match(result.extraction.coverage.notes, /coverage internally_conflicting; dropped survivor indices 1/);
}

// 9. Validator abstains: unresolved.
{
  const client = stubClient([generatorTwo, reviewGood, coverageComplete, JSON.stringify({ verdict: 'abstain', reason: 'doubt' })]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'ai_review_unresolved');
}

// 10. Zero drafts: accepted-zero when coverage confirms; unresolved on gap.
{
  const empty = JSON.stringify({ claims: [] });
  const client = stubClient([empty, coverageComplete, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'accepted');
  assert.deepEqual(result.extraction.candidates, []);
  assert.equal(isObProdExtraction(result.extraction), true);
}
{
  const empty = JSON.stringify({ claims: [] });
  const gap = JSON.stringify({
    verdict: 'missing_major_concept', notes: 'gap', missing_concepts: ['x'], drop_indices: [], importance_changes: [],
  });
  const client = stubClient([empty, gap]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'ai_review_unresolved');
}

// 11. Malformed outputs classify precisely.
{
  const client = stubClient(['not json']);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_malformed');
}
{
  const mismatch = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
    ],
  });
  const client = stubClient([generatorTwo, mismatch]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_malformed');
}

// 12. 429 / timeout / refusal / empty classification.
{
  const err429 = new Error('Rate limit exceeded');
  (err429 as { status?: number }).status = 429;
  const client = stubClient([err429]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_429');
}
{
  const client = stubClient([new Error('socket timed out after 120000ms')]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_timeout');
}
{
  const client = stubClient([{ refusal: 'I cannot help' }]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_refused');
}
{
  const client = stubClient([null]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_empty');
}

// 13. Safety net: vignette text accepted by reviewers still cannot persist.
{
  const vignette = 'A 46-year-old man who fell from a ladder requires operative fixation.';
  const generator = JSON.stringify({
    claims: [{ text: vignette, importance: 'primary', claim_type: 'treatment_indication', qualifiers: QUALIFIERS, support: ['stem'], confidence: 0.9 }],
  });
  const review = JSON.stringify({
    judgments: [
      { claim_index: 0, factual: 'supported', factual_reason: 'ok', quality: 'good', quality_reason: 'ok', importance_override: 'keep' },
    ],
  });
  const client = stubClient([generator, review, coverageComplete, validatorAccept]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  assert.equal(result.extraction.finalState, 'ai_review_unresolved');
}

// 14. Request shape: timeout rides the SDK options argument, never the body
// (body timeout is a live 400: "Unrecognized request argument supplied: timeout").
// 15. Classifier: a 4xx mentioning 'timeout' is a client bug, not a timeout.
{
  const seen: Array<{ body: Record<string, unknown>; options: unknown }> = [];
  const queue = [generatorTwo, reviewGood, coverageComplete, validatorAccept];
  const client = {
    chat: {
      completions: {
        create: (body: Record<string, unknown>, options: unknown) => {
          seen.push({ body, options });
          const content = queue.shift() ?? validatorAccept;
          return Promise.resolve({
            choices: [{ message: { content } }],
            usage: { prompt_tokens: 1, completion_tokens: 1 },
          });
        },
      },
    },
  };
  const result = await runProductionExtraction(PACKET, SOURCE, {
    client: client as never, models: MODELS, requestTimeoutMs: 4242,
  });
  assert.equal(result.ok, true);
  assert.equal(seen.length, 4);
  for (const call of seen) {
    assert.equal('timeout' in call.body, false);
    assert.deepEqual(call.options, { timeout: 4242 });
  }
}
{
  const err400 = new Error('400 Unrecognized request argument supplied: timeout');
  (err400 as { status?: number }).status = 400;
  const client = stubClient([err400]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_empty');
  assert.match(result.detail, /Unrecognized request argument/);
}
{
  const err500 = new Error('500 The server had an error while processing your request');
  (err500 as { status?: number }).status = 500;
  const client = stubClient([err500]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_timeout');
}
{
  const abort = new Error('The operation was aborted');
  abort.name = 'AbortError';
  const client = stubClient([abort]);
  const result = await runProductionExtraction(PACKET, SOURCE, { client: client as never, models: MODELS });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  assert.equal(result.diagnostic, 'model_timeout');
}

console.log('claim-review-pipeline.test.ts: all assertions passed');
