import assert from 'node:assert/strict';
import {
  candidateId,
  containsProtectedContent,
  exactDurableIdentity,
  extractionAttemptId,
  isObProdAcceptanceConsistent,
  isObProdExtraction,
  isObProdQualifiers,
  isObProdSourceIdentity,
  objectTextV5,
  OB_PROD_ALGORITHM,
  OB_PROD_CONTRACT_VERSION,
  questionClaimLinkKey,
  safetyChecksContractV1,
  sha256Hex,
  structuralPayloadV5,
  uuidFromHash,
  vignetteFlagsContractV1,
  type ObProdExtraction,
} from './claim-extraction-contract-v1';

// --- identities: deterministic, version-sensitive ---

const attemptInput = {
  provider: 'orthobullets', nativeQuestionId: '1150',
  sourceHash: 'a'.repeat(64), algorithmVersion: OB_PROD_ALGORITHM,
  promptSetVersion: 'ob-claims-prod-prompts-v1.0', attemptNo: 0,
};
const attemptA = extractionAttemptId(attemptInput);
assert.match(attemptA, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
assert.equal(extractionAttemptId(attemptInput), attemptA);
assert.notEqual(extractionAttemptId({ ...attemptInput, attemptNo: 1 }), attemptA);
assert.notEqual(extractionAttemptId({ ...attemptInput, sourceHash: 'b'.repeat(64) }), attemptA);

const candidateInput = {
  attemptId: attemptA, index: 0,
  text: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
  claimType: 'anatomy', importance: 'primary',
};
assert.equal(candidateId(candidateInput), candidateId(candidateInput));
assert.notEqual(candidateId(candidateInput), candidateId({ ...candidateInput, index: 1 }));
assert.notEqual(candidateId(candidateInput), candidateId({ ...candidateInput, importance: 'secondary' }));

assert.equal(questionClaimLinkKey({ provider: 'orthobullets', nativeQuestionId: '1150', claimId: 'abc' }),
  questionClaimLinkKey({ provider: 'orthobullets', nativeQuestionId: '1150', claimId: 'ABC' }));
assert.equal(sha256Hex('x').length, 64);
assert.equal(uuidFromHash('zz'), uuidFromHash('zz'));

// --- structural payload: NULL entity OMITS the line (concat_ws parity) ---

const payload = structuralPayloadV5({ claimType: 'Anatomy', objectText: 'The Radial  Nerve!', qualifiers: { anatomy: 'Humeral Shaft', setting: '' } });
assert.equal(payload, 'type=anatomy\npredicate=v5 assertion\nobject=the radial nerve\nqualifiers=anatomy=humeral shaft');
assert.ok(!payload.includes('entity='));
assert.equal(objectTextV5('  Mixed   CASE claim text here.  '), 'mixed case claim text here.');
assert.ok(objectTextV5('x'.repeat(500)).length === 200);

const identity = exactDurableIdentity({
  claimText: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
  claimType: 'anatomy', qualifiers: { anatomy: 'humeral shaft' },
});
assert.match(identity.structuralHash, /^[0-9a-f]{64}$/);
assert.match(identity.semanticHash, /^[0-9a-f]{64}$/);
assert.equal(exactDurableIdentity({
  claimText: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
  claimType: 'anatomy', qualifiers: { anatomy: 'humeral shaft' },
}).structuralHash, identity.structuralHash);
// Qualifier changes alter identity (distinction preservation).
assert.notEqual(exactDurableIdentity({
  claimText: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
  claimType: 'anatomy', qualifiers: { anatomy: 'humeral shaft', laterality: 'left' },
}).structuralHash, identity.structuralHash);

// --- frozen vignette rules ---

assert.deepEqual(vignetteFlagsContractV1('Fixation is preferred for displaced fractures in patients over 60 years old.'), []);
assert.deepEqual(vignetteFlagsContractV1('Screening applies to patients aged 10-18 years old.'), []);
assert.ok(vignetteFlagsContractV1('In a 42-year-old male laborer, fixation is preferred for this fracture pattern.').includes('age_vignette'));
assert.ok(vignetteFlagsContractV1('A 23-year-old football player presents with knee instability after pivoting.').length > 0);
assert.ok(vignetteFlagsContractV1('A 46-year-old man who fell from a ladder requires operative fixation.').length > 0);

// --- protected content ---

assert.equal(containsProtectedContent({ candidate_id: 'x', qualifiers: {} }), false);
assert.equal(containsProtectedContent({ stem: 'secret' }), true);
assert.equal(containsProtectedContent({ nested: { Explanation: 'secret' } }), true);
assert.equal(containsProtectedContent([{ front: 'x' }]), true);

// --- qualifiers ---

assert.equal(isObProdQualifiers({ anatomy: 'knee', severity: 'grade III' }), true);
assert.equal(isObProdQualifiers({}), true);
assert.equal(isObProdQualifiers({ invented: 'x' }), false);
assert.equal(isObProdQualifiers({ anatomy: '' }), false);
assert.equal(isObProdQualifiers({ anatomy: 'x'.repeat(81) }), false);
assert.equal(isObProdQualifiers({ stem: 'x' }), false);

// --- source identity ---

assert.equal(isObProdSourceIdentity({
  provider: 'orthobullets', nativeQuestionId: '1150', registryQuestionId: null,
  sourceHash: 'a'.repeat(64), reviewLocator: 'https://www.orthobullets.com/testview?qid=1150',
}), true);
assert.equal(isObProdSourceIdentity({
  provider: 'orthobullets', nativeQuestionId: '1150', registryQuestionId: 'not-a-uuid',
  sourceHash: 'a'.repeat(64), reviewLocator: 'https://www.orthobullets.com/testview?qid=1150',
}), false);
assert.equal(isObProdSourceIdentity({
  provider: 'orthobullets', nativeQuestionId: '1150', registryQuestionId: null,
  sourceHash: 'short', reviewLocator: 'https://www.orthobullets.com/testview?qid=1150',
}), false);
assert.equal(isObProdSourceIdentity({
  provider: 'orthobullets', nativeQuestionId: '1150', registryQuestionId: null,
  sourceHash: 'a'.repeat(64), reviewLocator: 'https://evil.example.com/testview?qid=1150',
}), false);

// --- extraction validation + acceptance consistency ---

function baseExtraction(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contractVersion: OB_PROD_CONTRACT_VERSION,
    attemptId: attemptA, attemptNo: 0, supersedesAttemptId: null,
    algorithmVersion: OB_PROD_ALGORITHM,
    promptVersions: { generator: 'g', review: 'r', coverage: 'c', repair: 'p', validator: 'v' },
    models: { generator: 'm', reviewer: 'm', coverage: 'm', repair: 'm', validator: 'm' },
    source: {
      provider: 'orthobullets', nativeQuestionId: '1150', registryQuestionId: null,
      sourceHash: 'a'.repeat(64), reviewLocator: 'https://www.orthobullets.com/testview?qid=1150',
    },
    startedAt: '2026-09-28T00:00:00.000Z', completedAt: '2026-09-28T00:01:00.000Z',
    candidates: [], coverage: { verdict: 'complete', notes: '', missingConcepts: [] },
    finalState: 'accepted',
    usage: {
      generator: { modelCalls: 1, promptTokens: 1, completionTokens: 1, estimatedCostUsd: null },
      review: { modelCalls: 0, promptTokens: 0, completionTokens: 0, estimatedCostUsd: null },
      coverage: { modelCalls: 1, promptTokens: 1, completionTokens: 1, estimatedCostUsd: null },
      repair: { modelCalls: 0, promptTokens: 0, completionTokens: 0, estimatedCostUsd: null },
      validator: { modelCalls: 1, promptTokens: 1, completionTokens: 1, estimatedCostUsd: null },
    },
    diagnostics: [],
    ...overrides,
  };
}

function acceptedCandidate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    candidateId: '11111111-1111-4111-8111-111111111111', index: 0,
    text: 'The radial nerve travels in the spiral groove along the posterior humeral shaft.',
    importance: 'primary', claimType: 'anatomy', qualifiers: { anatomy: 'humeral shaft' },
    support: ['stem', 'explanation'],
    generator: { model: 'm', promptVersion: 'g', confidence: 0.42 },
    factual: { verdict: 'supported', reason: 'entailed' },
    quality: { verdict: 'good', reason: 'clean' },
    repairs: [],
    finalFactual: 'supported', finalQuality: 'good',
    validator: { verdict: 'accept', reason: 'independent pass' },
    accepted: true,
    ...overrides,
  };
}

assert.equal(isObProdExtraction(baseExtraction()), true);
assert.equal(isObProdExtraction(baseExtraction({ candidates: [acceptedCandidate()] })), true);
// Confidence plays no role: low confidence with categorical gates still validates.
assert.equal(isObProdExtraction(baseExtraction({ candidates: [acceptedCandidate()] })), true);
// Accepted with an unsupported claim is inconsistent.
assert.equal(isObProdExtraction(baseExtraction({
  candidates: [acceptedCandidate({ finalFactual: 'ambiguous' })],
})), false);
// Accepted with incomplete coverage is inconsistent.
assert.equal(isObProdExtraction(baseExtraction({
  candidates: [acceptedCandidate()],
  coverage: { verdict: 'missing_major_concept', notes: '', missingConcepts: ['x'] },
})), false);
// Unresolved must not mark claims accepted.
assert.equal(isObProdExtraction(baseExtraction({
  finalState: 'ai_review_unresolved', candidates: [acceptedCandidate()],
  coverage: { verdict: 'missing_major_concept', notes: '', missingConcepts: ['x'] },
})), false);
assert.equal(isObProdExtraction(baseExtraction({
  finalState: 'ai_review_unresolved',
  candidates: [acceptedCandidate({ accepted: false, validator: { verdict: 'abstain', reason: 'dropped' } })],
  coverage: { verdict: 'missing_major_concept', notes: '', missingConcepts: ['x'] },
})), true);
// Repair budget enforced.
assert.equal(isObProdExtraction(baseExtraction({
  candidates: [acceptedCandidate({
    repairs: [
      { stage: 'quality_repair', action: 'rewrite', beforeText: 'a'.repeat(30), afterTexts: ['b'.repeat(30)], reason: 'r', repairedAt: '2026-09-28T00:00:30.000Z' },
      { stage: 'quality_repair', action: 'rewrite', beforeText: 'a'.repeat(30), afterTexts: ['b'.repeat(30)], reason: 'r', repairedAt: '2026-09-28T00:00:31.000Z' },
    ],
  })],
})), false);
// Contract version + algorithm pinned.
assert.equal(isObProdExtraction(baseExtraction({ contractVersion: 'other' })), false);
assert.equal(isObProdExtraction(baseExtraction({ algorithmVersion: 'orthobullets-claims-v4' })), false);
// Protected content rejected anywhere.
assert.equal(isObProdExtraction(baseExtraction({ candidates: [acceptedCandidate({ text: 'x'.repeat(30), support: ['stem'], explanation: 'leak' })] })), false);

// --- safety checks ---

assert.deepEqual(safetyChecksContractV1([acceptedCandidate() as never]), []);
assert.equal(safetyChecksContractV1([acceptedCandidate({ text: 'A 46-year-old man who fell requires fixation here now.' }) as never]).length, 1);
assert.equal(safetyChecksContractV1([acceptedCandidate({ text: 'short' }) as never]).length, 1);

assert.equal(isObProdAcceptanceConsistent(baseExtraction() as unknown as ObProdExtraction), true);

console.log('claim-extraction-contract-v1.test.ts: all assertions passed');
