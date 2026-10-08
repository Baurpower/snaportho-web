import assert from 'node:assert/strict';

import {
  assertDurableResultClean,
  processTransientOrthobulletsQuestion,
  releaseTransientPacket,
  transientPacketFromPageContext,
  type DurableTransientResult,
  type TransientProcessorDb,
} from './transient-claim-processor';
import { assertPayloadHasNoSourceText } from './transient-production-runner';
import type { ObSourcePacketV5 } from './claim-extractor-v5';

// Unique sentinel per source field. If any durable artifact contains one,
// raw source text crossed the persistence boundary.
const SENTINELS = {
  stem: 'SENTINEL_STEM_ZKQ7_FRACTURE_VIGNETTE_TEXT',
  choice: 'SENTINEL_CHOICE_ZKQ7_FIXATION_OPTION',
  correct: 'SENTINEL_CORRECT_ZKQ7_REVEALED_ANSWER',
  explanation: 'SENTINEL_EXPL_ZKQ7_PREFERRED_RESPONSE_TEXT',
  topic: 'SENTINEL_TOPIC_ZKQ7_SYNTHETIC_SPECIALTY',
  html: 'SENTINEL_HTML_ZKQ7_PAGE_MARKUP_BLOCK',
};

function sentinelPacket(): ObSourcePacketV5 {
  return {
    stem: `Synthetic stem carrying ${SENTINELS.stem} for boundary testing?`,
    answerChoices: [
      { key: '1', text: `First invented option ${SENTINELS.choice} one` },
      { key: '2', text: `Second invented option ${SENTINELS.choice} two` },
    ],
    correctAnswer: `Revealed invented answer ${SENTINELS.correct}`,
    explanationText: `Invented teaching text ${SENTINELS.explanation} for boundary testing.`,
    topicHints: [`Invented hint ${SENTINELS.topic}`],
  };
}

const CLAIM_TEXT = 'The synthetic teaching point favors invented fixation for unstable fictional patterns.';

function fakeDb(options: {
  completed?: { attemptId: string } | null;
  run?: {
    outcome: 'adopted' | 'accepted' | 'unresolved' | 'failed' | 'identity_unresolved' | 'identity_conflict';
    diagnostic?: string | null;
    reasonCodes?: string[];
    claims?: Array<{ id: string; text: string; claimType: string; importance: string; accepted: boolean }>;
    attemptId?: string | null;
  };
} = {}) {
  let runs = 0;
  const db: TransientProcessorDb = {
    findCompletedExtraction: async () => options.completed ?? null,
    runProductionSingle: async () => {
      runs += 1;
      const run = options.run ?? {
        outcome: 'accepted' as const,
        diagnostic: null,
        reasonCodes: [],
        claims: [{ id: 'c1', text: CLAIM_TEXT, claimType: 'treatment_indication', importance: 'primary', accepted: true }],
        attemptId: 'attempt-9',
      };
      return {
        outcome: run.outcome,
        diagnostic: run.diagnostic ?? null,
        reasonCodes: run.reasonCodes ?? [],
        claimsAccepted: (run.claims ?? []).filter((claim) => claim.accepted).length,
        promptTokens: 100,
        completionTokens: 50,
        estimatedCostUsd: 0.001,
        claims: run.claims ?? [],
        attemptId: run.attemptId ?? null,
      };
    },
  };
  return { db, runs: () => runs };
}

const LOCATOR = 'https://www.orthobullets.com/testview?qid=210141&ans=5&test=OBQ17';

function assertNoSentinels(label: string, value: unknown) {
  const serialized = JSON.stringify(value) ?? '';
  for (const sentinel of Object.values(SENTINELS)) {
    assert.ok(!serialized.includes(sentinel), `${label} leaked source sentinel ${sentinel}`);
  }
}

// 1. Accepted production run: claims flow through, metadata stays clean,
// raw packet is released afterwards.
{
  const packet = sentinelPacket();
  const { db, runs } = fakeDb();
  const { durable } = await processTransientOrthobulletsQuestion(
    { nativeQuestionId: '210141', reviewLocator: LOCATOR, packet },
    { db, now: () => '2026-10-08T00:00:00.000Z' },
  );
  assert.equal(durable.status, 'accepted');
  assert.equal(durable.claims.length, 1);
  assert.equal(durable.claims[0].text, CLAIM_TEXT);
  assert.match(durable.sourceHash, /^[0-9a-f]{64}$/);
  assert.equal(runs(), 1);

  // Persistence boundary: durable metadata (hashes, ids, locators,
  // diagnostics, usage) carries no source prose. Claim texts are asserted
  // separately: they must be exactly the model-authored outputs.
  const checkpoint = { durable };
  const report = { nativeQuestionId: '210141', status: durable.status, durable };
  const logs = [`processed 210141 status=${durable.status}`, JSON.stringify(durable.diagnostics)];
  assertNoSentinels('durable metadata', { ...durable, claims: [] });
  assertNoSentinels('checkpoint', { ...checkpoint.durable, claims: [] });
  assertNoSentinels('report', { ...report.durable, claims: [] });
  assertNoSentinels('logs', logs);
  assert.deepEqual(durable.claims.map((claim) => claim.text), [CLAIM_TEXT]);

  assert.equal(packet.stem, '');
  assert.deepEqual(packet.answerChoices, []);
  assert.equal(packet.correctAnswer, null);
  assert.equal(packet.explanationText, null);
  assert.deepEqual(packet.topicHints, []);
}

// 2. Restart-safe: identical completed source hashes skip without a run.
{
  const packet = sentinelPacket();
  const { db, runs } = fakeDb({ completed: { attemptId: 'attempt-1' } });
  const { durable } = await processTransientOrthobulletsQuestion(
    { nativeQuestionId: '210141', reviewLocator: LOCATOR, packet },
    { db },
  );
  assert.equal(durable.status, 'skipped_completed');
  assert.equal(durable.completedAttemptId, 'attempt-1');
  assert.deepEqual(durable.claims, []);
  assert.equal(runs(), 0);
  assertNoSentinels('skipped durable', durable);
  assert.equal(packet.stem, '');
}

// 3. Adopted (lib-side race-safe skip) maps to skipped_completed.
{
  const packet = sentinelPacket();
  const { db } = fakeDb({ run: { outcome: 'adopted', attemptId: 'attempt-2' } });
  const { durable } = await processTransientOrthobulletsQuestion(
    { nativeQuestionId: '210141', reviewLocator: LOCATOR, packet },
    { db },
  );
  assert.equal(durable.status, 'skipped_completed');
  assert.equal(durable.completedAttemptId, 'attempt-2');
}

// 4. Outcome mapping: unresolved, identity, and failed paths.
{
  const packet = sentinelPacket();
  const { db } = fakeDb({ run: { outcome: 'unresolved', diagnostic: 'review_unresolved', reasonCodes: ['coverage_gap'] } });
  const { durable } = await processTransientOrthobulletsQuestion(
    { nativeQuestionId: '210141', reviewLocator: LOCATOR, packet },
    { db },
  );
  assert.equal(durable.status, 'ai_review_unresolved');
  assert.deepEqual(durable.diagnostics, ['review_unresolved', 'coverage_gap']);
}
{
  for (const outcome of ['identity_unresolved', 'identity_conflict'] as const) {
    const packet = sentinelPacket();
    const { db } = fakeDb({ run: { outcome, diagnostic: outcome } });
    const { durable } = await processTransientOrthobulletsQuestion(
      { nativeQuestionId: '210141', reviewLocator: LOCATOR, packet },
      { db },
    );
    assert.equal(durable.status, outcome);
  }
}
{
  const packet = sentinelPacket();
  const { db } = fakeDb({ run: { outcome: 'failed', diagnostic: 'model_429' } });
  const { durable } = await processTransientOrthobulletsQuestion(
    { nativeQuestionId: '210141', reviewLocator: LOCATOR, packet },
    { db },
  );
  assert.equal(durable.status, 'failed_transient');
  assert.deepEqual(durable.diagnostics, ['model_429']);
}

// 5. Invalid locators throw before any production run, without source text.
{
  const packet = sentinelPacket();
  const { db, runs } = fakeDb();
  await assert.rejects(
    processTransientOrthobulletsQuestion(
      { nativeQuestionId: '210141', reviewLocator: 'https://example.com/testview?qid=1', packet },
      { db },
    ),
    /review_locator_must_be_orthobullets/,
  );
  assert.equal(runs(), 0);
  assert.equal(packet.stem, '');
}

// 6. Negative control: the durable guard throws when source text reaches
// durable metadata (claim texts are excluded by design).
{
  const packet = sentinelPacket();
  const { db } = fakeDb();
  const { durable } = await processTransientOrthobulletsQuestion(
    { nativeQuestionId: '210141', reviewLocator: LOCATOR, packet: sentinelPacket() },
    { db },
  );
  assert.throws(
    () => assertDurableResultClean({ ...durable, reviewLocator: `https://x.invalid/${packet.stem}` }, packet),
    /transient_source_text_at_persistence_boundary/,
  );
}

// 7. Persist-payload scan: structural echo throws, clean payload passes,
// and candidate claim texts are excluded from the scan.
{
  const packet = sentinelPacket();
  const clean = {
    attempt_id: 'a', source: { provider: 'orthobullets', native_question_id: '1', source_hash: 'x' },
    candidates: [{ candidate_id: 'c', text: CLAIM_TEXT, final_text: CLAIM_TEXT }],
  };
  assertPayloadHasNoSourceText(clean, packet);
  // Even a claim quoting source prose passes: claims are model outputs
  // governed by review gates, not by the structural scan.
  assertPayloadHasNoSourceText(
    { ...clean, candidates: [{ candidate_id: 'c', text: packet.stem, final_text: packet.stem }] },
    packet,
  );
  assert.throws(
    () => assertPayloadHasNoSourceText({ ...clean, coverage: { notes: packet.explanationText } }, packet),
    /transient_source_text_at_persistence_boundary/,
  );
}

// 8. Ready page contexts convert to transient packets without HTML.
{
  const packet = transientPacketFromPageContext({
    stem: 'Synthetic stem?',
    answerChoices: [
      { key: '1', text: 'One' },
      { key: '2', label: '2', text: 'Two' },
    ],
    correctAnswer: 'Two',
    explanationText: 'Synthetic teaching.',
    breadcrumbs: ['Alpha', 'Beta'],
    title: 'Synthetic title',
  });
  assert.equal(packet.stem, 'Synthetic stem?');
  assert.deepEqual(packet.answerChoices, [{ key: '1', text: 'One' }, { key: '2', text: 'Two' }]);
  assert.equal(packet.correctAnswer, 'Two');
  assert.equal(packet.explanationText, 'Synthetic teaching.');
  assert.deepEqual(packet.topicHints, ['Alpha', 'Beta', 'Synthetic title']);
  assert.ok(!('pageHtml' in packet));
  releaseTransientPacket(packet);
  assert.equal(packet.stem, '');
}

console.log('Transient claim processor tests passed.');
