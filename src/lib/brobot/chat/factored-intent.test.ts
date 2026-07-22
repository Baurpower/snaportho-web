import assert from 'node:assert/strict';

import { resolveBroBotFactoredIntentMode } from '@/lib/brobot/model-config';
import { detectBroBotInteractionConstraints } from './interaction-constraints';
import { deriveBroBotFactoredIntent, mapFactoredIntentToLegacy, type BroBotFactoredIntent } from './factored-intent';
import { buildFactoredIntentTelemetry, recordFactoredIntentTelemetrySafely } from './factored-intent-telemetry';
import { serializeLegacyResponse, serializeWebResponseV2, type BroBotChatInternalResult } from './response-contract';

const classify = (message: string, overrides: Partial<Parameters<typeof deriveBroBotFactoredIntent>[0]> = {}) =>
  deriveBroBotFactoredIntent({
    message,
    selectedMode: 'auto',
    responseDepth: 'standard',
    trainingLevel: 'pgy2',
    legacyIntent: { mode: 'general', subintent: 'overview', procedureOrTopic: 'topic', confidence: 0.8 },
    ...overrides,
  });

// 1. A selected Consult mode is only a weak prior for broad educational indications.
const reverseTsa = classify('What are the indications for reverse TSA?', {
  selectedMode: 'consult',
  legacyIntent: { mode: 'consult', subintent: 'operative_indications', procedureOrTopic: 'reverse TSA' },
});
assert.equal(reverseTsa.setting, 'general');
assert.equal(reverseTsa.task, 'decide');
assert.equal(reverseTsa.patientSpecificity, 'educational');

// 2. Newest operative task overrides Clinic selection.
const triggerRelease = classify('Walk me through the surgical steps for trigger-finger release.', {
  selectedMode: 'clinic', legacyIntent: { mode: 'clinic', subintent: 'surgical_steps', procedureOrTopic: 'trigger finger release' },
});
assert.equal(triggerRelease.setting, 'or');
assert.equal(triggerRelease.task, 'plan');

// 3-4. Evidence requests distinguish required from current.
const screwArticles = classify('Give me articles on orthopedic screws.');
assert.deepEqual([screwArticles.setting, screwArticles.task, screwArticles.evidenceNeed], ['research', 'retrieve_evidence', 'required']);
const latestTka = classify('What are the latest TKA implant advancements?');
assert.deepEqual([latestTka.setting, latestTka.task, latestTka.evidenceNeed], ['research', 'retrieve_evidence', 'current']);

// 5. Explicit time/depth and operative prep.
const plateau = classify('Prep me for tibial plateau ORIF in three minutes.');
assert.deepEqual([plateau.setting, plateau.task, plateau.depth], ['or', 'plan', 'quick']);

// 6. Meaningful patient details create a case-specific consult.
const tibia = classify('A 45-year-old has a tibial-shaft fracture after a motorcycle crash.');
assert.equal(tibia.setting, 'consult');
assert.equal(tibia.patientSpecificity, 'case_specific');

// 7. Comparison wins over selected/legacy mode.
const cement = classify('Cementless versus cemented TKA.', {
  selectedMode: 'oite', legacyIntent: { mode: 'oite', subintent: 'overview', procedureOrTopic: 'TKA' },
});
assert.equal(cement.task, 'compare');

// 8. Reuse the existing staged-quiz detector.
const stagedMessage = 'Quiz me on acetabular fractures one at a time and give answers after I respond.';
const stagedConstraints = detectBroBotInteractionConstraints({ message: stagedMessage });
const staged = classify(stagedMessage, {
  selectedMode: 'oite',
  legacyIntent: { mode: 'oite', subintent: 'quiz', procedureOrTopic: 'acetabular fractures' },
  interactionConstraints: stagedConstraints,
});
assert.equal(staged.task, 'quiz');
assert.equal(staged.interaction, 'staged_quiz');
assert.equal(stagedConstraints.stagedQuiz, true);

// 9. Explicit audience overrides stored training level.
const newIntern = classify("I'm a new PGY-1. Teach me how to give a consult presentation.", { trainingLevel: 'pgy4' });
assert.equal(newIntern.setting, 'consult');
assert.equal(newIntern.audience, 'junior_resident');
assert.equal(newIntern.sources.audience, 'deterministic');

// 10 and 12. Emergency wins over General or other incompatible modes.
const pulseless = classify('Pulseless foot after knee dislocation.', {
  selectedMode: 'general', legacyIntent: { mode: 'general', subintent: 'overview' },
});
assert.deepEqual([pulseless.setting, pulseless.urgency, pulseless.patientSpecificity], ['consult', 'emergent', 'case_specific']);
const compartment = classify('Concern for compartment syndrome after a tibia fracture.', {
  selectedMode: 'clinic', legacyIntent: { mode: 'clinic', subintent: 'workup' },
});
assert.equal(compartment.setting, 'consult');
assert.equal(compartment.urgency, 'emergent');

// 11. A broad educational request is not forced into OR by the selected mode.
const broad = classify('Teach me osteoporosis.', {
  selectedMode: 'or_prep', legacyIntent: { mode: 'or_prep', subintent: 'overview', procedureOrTopic: 'osteoporosis' },
});
assert.equal(broad.setting, 'general');

// 13. Attending text overrides a junior stored level.
const attending = classify('Give me an attending-level analysis of this evidence.', { trainingLevel: 'pgy1' });
assert.equal(attending.audience, 'attending');

// 14. The newest task overrides stale legacy branch context.
const staleBranch = classify('Give me recent articles on fixation failure.', {
  selectedMode: 'or_prep', legacyIntent: { mode: 'or_prep', subintent: 'surgical_steps', procedureOrTopic: 'distal radius ORIF' },
});
assert.equal(staleBranch.setting, 'research');
assert.equal(staleBranch.task, 'retrieve_evidence');

// 15. Partial/malformed legacy classifier data falls back per field and never throws.
const malformed = classify('Explain this topic.', {
  legacyIntent: { mode: { invalid: true }, subintent: 42, confidence: Number.POSITIVE_INFINITY },
  conversationState: null,
});
assert.equal(malformed.setting, 'general');
assert.equal(malformed.task, 'explain');
assert.ok(malformed.confidence >= 0 && malformed.confidence <= 1);

// 16-17. Feature mode parsing is fail-closed and enabled remains observational.
assert.equal(resolveBroBotFactoredIntentMode(undefined), 'off');
assert.equal(resolveBroBotFactoredIntentMode('invalid'), 'off');
assert.equal(resolveBroBotFactoredIntentMode('shadow'), 'shadow');
assert.equal(resolveBroBotFactoredIntentMode('enabled'), 'enabled');

// Mapper exists for telemetry comparison only and safely uses supported legacy values.
assert.deepEqual(mapFactoredIntentToLegacy(plateau), { mode: 'or_prep', subintent: 'surgical_steps' });
assert.deepEqual(mapFactoredIntentToLegacy(staged), { mode: 'oite', subintent: 'quiz' });
const unknownTask = { ...broad, task: 'explain' } as BroBotFactoredIntent;
assert.deepEqual(mapFactoredIntentToLegacy(unknownTask), { mode: 'general', subintent: 'overview' });

// Telemetry contains only enumerated comparisons, never topic/procedure/raw messages/state.
const metadata = buildFactoredIntentTelemetry({
  featureMode: 'shadow', legacyMode: 'fracture_call', legacySubintent: 'fracture',
  factoredIntent: pulseless, latencyMs: 1.2345,
});
assert.equal(metadata.mapped_factored_mode, 'consult');
assert.equal(metadata.legacy_factored_mode_agreement, true);
assert.equal('topic' in metadata, false);
assert.equal('procedure' in metadata, false);
assert.equal('message' in metadata, false);

// 18. Telemetry failure is swallowed, and off performs no write.
let telemetryAttempts = 0;
await recordFactoredIntentTelemetrySafely({
  mode: 'off', metadata, record: async () => { telemetryAttempts += 1; },
});
assert.equal(telemetryAttempts, 0);
await recordFactoredIntentTelemetrySafely({
  mode: 'shadow', metadata,
  record: async () => { telemetryAttempts += 1; throw new Error('fixture telemetry failure'); },
});
assert.equal(telemetryAttempts, 1);

// 19. Existing interaction constraints remain the single source for staged quiz/compare/evidence.
assert.equal(stagedConstraints.stagedQuiz, true);
assert.equal(detectBroBotInteractionConstraints({ message: 'A vs B' }).compare, true);
assert.equal(detectBroBotInteractionConstraints({ message: 'Give me papers' }).evidenceRequest, true);

// 20. Factored fields cannot leak through the legacy allowlist; web_v2 remains compatible.
const internal: BroBotChatInternalResult = {
  conversationId: 'fixture-conversation', messageId: 'fixture-message', answer: 'fixture',
  priorityPoints: [], knowledgeGaps: [], suggestedQuestions: [], tags: [], detectedMode: 'general',
};
const internalWithFactored = { ...internal, factoredIntent: plateau } as BroBotChatInternalResult;
assert.equal('factoredIntent' in serializeLegacyResponse(internalWithFactored), false);
assert.equal(serializeWebResponseV2(internalWithFactored).responseVersion, 2);

console.log('BroBot factored-intent shadow tests passed.');
