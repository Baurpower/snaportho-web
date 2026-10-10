import assert from 'node:assert/strict';
import {
  canonicalReviewLocator,
  obRegistryLookupValues,
  resolveObQuestionIdentity,
  type ObRegistryQuestionRow,
} from './ob-question-identity';

assert.deepEqual(obRegistryLookupValues('4463', ['obq12.103', 'arbitrary', 123]),
  ['4463', 'OBQ12-103', 'obq12-103', 'OBQ12.103', 'obq12.103']);

const row = (overrides: Partial<ObRegistryQuestionRow> = {}): ObRegistryQuestionRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  sourceSlug: 'orthobullets',
  externalQuestionId: 'OBQ19-223',
  topicSlug: 'lumbar-disc-herniation',
  topicNormalized: 'Lumbar Disc Herniation',
  specialtyNormalized: 'spine',
  isActive: true,
  ...overrides,
});

assert.equal(canonicalReviewLocator('213938'), 'https://www.orthobullets.com/testview?qid=213938');

// Exact native match, topic corroborated.
{
  const result = resolveObQuestionIdentity({
    nativeQuestionId: 'OBQ19-223',
    topicSlug: 'lumbar-disc-herniation',
    nativeRows: [row()],
    aliasHits: [],
  });
  assert.equal(result.outcome, 'RESOLVED');
  assert.equal(result.registryQuestionId, row().id);
  assert.equal(result.method, 'registry_native_exact');
  assert.equal(result.confidence, 'high');
  assert.ok(result.evidence.includes('native_match'));
  assert.ok(result.evidence.includes('topic_corroborated'));
  assert.deepEqual(result.conflictingIds, []);
}

// Topic mismatch downgrades but still resolves (identity is by id).
{
  const result = resolveObQuestionIdentity({
    nativeQuestionId: 'OBQ19-223',
    topicSlug: 'acl-tear',
    nativeRows: [row()],
    aliasHits: [],
  });
  assert.equal(result.outcome, 'RESOLVED');
  assert.equal(result.confidence, 'medium');
  assert.ok(result.evidence.includes('topic_mismatch'));
}

// Alias singleton resolves at medium confidence.
{
  const target = row({ id: '22222222-2222-4222-8222-222222222222' });
  const result = resolveObQuestionIdentity({
    nativeQuestionId: '213938',
    nativeRows: [],
    aliasHits: [{ aliasKind: 'source_question_id', aliasValue: '213938', row: target }],
  });
  assert.equal(result.outcome, 'RESOLVED');
  assert.equal(result.registryQuestionId, target.id);
  assert.equal(result.method, 'registry_alias_exact');
  assert.equal(result.confidence, 'medium');
  assert.ok(result.evidence.includes('alias_singleton'));
}

// No match anywhere.
{
  const result = resolveObQuestionIdentity({ nativeQuestionId: '999999', nativeRows: [], aliasHits: [] });
  assert.equal(result.outcome, 'UNRESOLVED');
  assert.equal(result.registryQuestionId, null);
  assert.equal(result.method, 'no_registry_match');
}

// Native id ambiguous across rows.
{
  const result = resolveObQuestionIdentity({
    nativeQuestionId: 'OBQ19-223',
    nativeRows: [row(), row({ id: '33333333-3333-4333-8333-333333333333', sourceSlug: 'rock' })],
    aliasHits: [],
  });
  assert.equal(result.outcome, 'CONFLICT');
  assert.equal(result.method, 'native_id_ambiguous');
  assert.equal(result.conflictingIds.length, 2);
}

// Alias ambiguous.
{
  const result = resolveObQuestionIdentity({
    nativeQuestionId: '213938',
    nativeRows: [],
    aliasHits: [
      { aliasKind: 'source_question_id', aliasValue: '213938', row: row() },
      { aliasKind: 'legacy_qid', aliasValue: '213938', row: row({ id: '44444444-4444-4444-8444-444444444444' }) },
    ],
  });
  assert.equal(result.outcome, 'CONFLICT');
  assert.equal(result.method, 'alias_ambiguous');
}

// Native and alias disagree: never pick silently.
{
  const result = resolveObQuestionIdentity({
    nativeQuestionId: 'OBQ19-223',
    nativeRows: [row()],
    aliasHits: [{ aliasKind: 'source_question_id', aliasValue: 'OBQ19-223', row: row({ id: '55555555-5555-4555-8555-555555555555' }) }],
  });
  assert.equal(result.outcome, 'CONFLICT');
  assert.equal(result.registryQuestionId, null);
  assert.equal(result.method, 'native_alias_mismatch');
}

// Inactive rows never resolve.
{
  const result = resolveObQuestionIdentity({
    nativeQuestionId: 'OBQ19-223',
    nativeRows: [row({ isActive: false })],
    aliasHits: [],
  });
  assert.equal(result.outcome, 'UNRESOLVED');
}

// Observed locator variant is evidence, not a veto.
{
  const result = resolveObQuestionIdentity({
    nativeQuestionId: 'OBQ19-223',
    observedLocator: 'https://www.orthobullets.com/topic/1234',
    nativeRows: [row()],
    aliasHits: [],
  });
  assert.equal(result.outcome, 'RESOLVED');
  assert.ok(result.evidence.includes('observed_locator_variant'));
  assert.equal(result.locator, 'https://www.orthobullets.com/testview?qid=OBQ19-223');
}

console.log('ob-question-identity.test.ts: all assertions passed');
