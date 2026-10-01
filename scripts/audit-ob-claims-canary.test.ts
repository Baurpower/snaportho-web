import assert from 'node:assert/strict';
import { buildAuditManifestEntry } from './audit-ob-claims-canary';
import { sourceContentHashV5 } from '../src/lib/brobot/orthobullets/claim-extractor-v5';

const packet = {
  nativeQuestionId: '1062',
  specialty: 'trauma',
  packet: {
    stem: 'Which structure is at risk during this approach?',
    answerChoices: [{ key: 'A', text: 'Radial nerve' }, { key: 'B', text: 'Ulnar nerve' }],
    correctAnswer: 'A',
    explanationText: 'The radial nerve crosses the posterior humeral shaft.',
    topicHints: ['humerus'],
  },
};
const sourceFingerprintHash = sourceContentHashV5(packet.packet);
const base = {
  runId: '11111111-1111-4111-8111-111111111111',
  packet,
  item: { id: '22222222-2222-4222-8222-222222222222', status: 'accepted', liveAttemptId: '33333333-3333-4333-8333-333333333333' },
  event: {
    id: '33333333-3333-4333-8333-333333333333',
    runId: '11111111-1111-4111-8111-111111111111',
    sourceFingerprintHash,
    algorithmVersion: 'orthobullets-claims-prod.v1',
    promptSetVersion: 'ob-claims-prod-prompts-v1.0',
  },
  claims: [{ index: 0, text: 'The radial nerve crosses the posterior humeral shaft.', importance: 'primary', accepted: true }],
};

const entry = buildAuditManifestEntry(base);
assert.equal(entry.extractionEventId, base.event.id);
assert.equal(entry.sourceFingerprintHash, sourceFingerprintHash);
assert.match(entry.claimsHash, /^[0-9a-f]{64}$/);

assert.throws(() => buildAuditManifestEntry({
  ...base,
  event: { ...base.event, sourceFingerprintHash: 'a'.repeat(64) },
}), /source hash mismatch/);
assert.throws(() => buildAuditManifestEntry({
  ...base,
  item: { ...base.item, liveAttemptId: '44444444-4444-4444-8444-444444444444' },
}), /pointer mismatch/);
assert.throws(() => buildAuditManifestEntry({ ...base, event: null }), /pointer mismatch/);

const adopted = buildAuditManifestEntry({
  ...base,
  item: { ...base.item, status: 'adopted' },
  event: { ...base.event, runId: '55555555-5555-4555-8555-555555555555' },
});
assert.notEqual(adopted.eventRunId, adopted.runId);

console.log('audit-ob-claims-canary.test.ts: all assertions passed');
