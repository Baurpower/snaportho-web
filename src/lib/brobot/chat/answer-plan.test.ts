import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buildBroBotAnswerPlan, type BuildBroBotAnswerPlanInput } from './answer-plan';
import { validateBroBotAnswerPlan } from './answer-plan-validator';
import { buildAnswerPlanTelemetry, recordAnswerPlanTelemetrySafely } from './answer-plan-telemetry';
import { deriveBroBotFactoredIntent } from './factored-intent';
import { detectBroBotInteractionConstraints } from './interaction-constraints';
import { deriveBroBotConversationState } from './conversation-state';
import { serializeLegacyResponse, serializeWebResponseV2, type BroBotChatInternalResult } from './response-contract';
import { resolveBroBotAnswerPlannerMode } from '../model-config';
import type { BroBotChatIntent, BroBotChatMode, BroBotChatSubintent, BroBotModelMessage, BroBotResponseDepth, BroBotTrainingLevel } from './types';

const legacy = (mode: BroBotChatMode = 'general', subintent: BroBotChatSubintent = 'overview', topic = 'orthopaedics'): BroBotChatIntent => ({
  mode: mode === 'auto' ? 'general' : mode, subintent, procedureCategory: 'unknown', procedureOrTopic: topic,
  ambiguity: 'low', assumedContext: '', missingContext: [], clarifyingQuestions: [], confidence: 0.8,
});
function input(message: string, options: { mode?: BroBotChatMode; subintent?: BroBotChatSubintent; depth?: BroBotResponseDepth; level?: BroBotTrainingLevel; history?: BroBotModelMessage[]; selectedBranch?: { id?: string; label?: string }; mutateFactored?: (value: Record<string, unknown>) => void } = {}): BuildBroBotAnswerPlanInput {
  const history = options.history ?? [];
  const responseDepth = options.depth ?? 'standard'; const trainingLevel = options.level ?? 'pgy2';
  const legacyIntent = legacy(options.mode, options.subintent, message.slice(0, 80));
  const interactionConstraints = detectBroBotInteractionConstraints({ message, history });
  const conversationState = deriveBroBotConversationState({ message, history, topic: legacyIntent.procedureOrTopic, learnerLevel: trainingLevel });
  const factoredIntent = deriveBroBotFactoredIntent({ message, selectedMode: options.mode ?? 'general', responseDepth, trainingLevel, legacyIntent, conversationState, interactionConstraints });
  options.mutateFactored?.(factoredIntent as unknown as Record<string, unknown>);
  return { message, factoredIntent, interactionConstraints, conversationState, legacyIntent, responseDepth, trainingLevel, selectedBranch: options.selectedBranch };
}
const plan = (message: string, options?: Parameters<typeof input>[1]) => { const value = input(message, options); return { plan: buildBroBotAnswerPlan(value), input: value }; };
const has = (items: string[], re: RegExp) => items.some((item) => re.test(item));

// 1
{
  const { plan: p } = plan('How long does distal radius ORIF take?', { mode: 'or_prep' });
  assert.match(p.directAnswerObjective, /duration/); assert(has(p.requiredFacts, /variability|increase or decrease/));
  assert(has(p.prohibitedContent, /fluoroscopy checklist/)); assert(p.requiredFacts.length < 6);
}
// 2
{
  const { plan: p } = plan('Compare nail versus plate for distal femur fractures');
  assert.equal(p.task, 'compare'); assert(p.requestedFormat.comparison); assert(has(p.requiredFacts, /biomechanics.*tradeoffs/)); assert(has(p.requiredFacts, /preferred option by scenario/)); assert(p.decisionPivots.length > 1);
}
// 3
{
  const { plan: p, input: i } = plan('What are current indications for posterior malleolus fixation?');
  assert.equal(p.task, 'decide'); assert(has(p.requiredFacts, /morphology/)); assert(has(p.requiredFacts, /articular reduction/)); assert(has(p.requiredFacts, /syndesmotic stability/)); assert(p.evidenceQueries.length > 0);
  assert(!has(p.requiredFacts, /\b\d+\s*%/)); assert(!validateBroBotAnswerPlan(p, i).warnings.includes('unsupported_clinical_claim_in_plan'));
}
// 4
{
  const { plan: p } = plan('This patient has acute compartment syndrome after a fracture');
  assert(has(p.requiredFacts, /immediate escalation/)); assert(has(p.requiredFacts, /diagnostic or monitoring/)); assert(has(p.requiredFacts, /disposition/)); assert.equal(p.optionalSections.length, 0);
}
// 5
{
  const { plan: p } = plan('Give me recent articles on orthopedic screws');
  assert.equal(p.task, 'retrieve_evidence'); assert(has(p.evidenceQueries, /current verified evidence/)); assert(has(p.requiredFacts, /citations/)); assert(has(p.prohibitedContent, /fabricated citations/));
}
// 6
{
  const { plan: p } = plan('Quiz me on acetabular fractures one at a time and wait for my answer');
  assert(p.requestedFormat.stagedQuiz); assert(has(p.requiredFacts, /one question at a time/)); assert(has(p.prohibitedContent, /revealing the answer/));
}
// 7
{
  const history: BroBotModelMessage[] = [{ role: 'user', content: 'Which tendon transfer?' }, { role: 'assistant', content: 'EIP to APB is the standard transfer.' }];
  const { plan: p } = plan('Actually, EIP is transferred to EPL. Give the full corrected answer.', { history });
  assert(has(p.requiredFacts, /acknowledge the correction/)); assert(has(p.prohibitedContent, /superseded claim/));
}
// 8
{
  const history: BroBotModelMessage[] = [{ role: 'user', content: 'Compare cemented versus cementless TKA' }, { role: 'assistant', content: 'Prior explanation' }];
  const { plan: p } = plan('Compare cemented versus cementless TKA', { history });
  assert(has(p.requiredFacts, /materially different/)); assert(has(p.decisionPivots, /missing dimension|clarification/)); assert(has(p.prohibitedContent, /identical prior/));
}
// 9
{
  const { plan: p } = plan('Explain TKA implant categories for a medical student', { level: 'med_student' });
  assert(has(p.requiredFacts, /orientation/)); assert(has(p.requiredFacts, /constraint categories/)); assert(has(p.requiredFacts, /bearing categories/)); assert(has(p.requiredFacts, /fixation categories/));
}
// 10
{
  const { plan: p } = plan('What are the broad indications for reverse TSA?', { mode: 'consult', subintent: 'indications' });
  assert.equal(p.setting, 'general'); assert(!has(p.requiredFacts, /disposition|focused examination/));
}
// 11
{
  const { plan: p } = plan('A 35-year-old after a crash has a tibial shaft fracture; help me present the ED consult', { mode: 'consult' });
  assert.equal(p.setting, 'consult'); assert(has(p.requiredFacts, /urgency/)); assert(has(p.requiredFacts, /missing critical information/)); assert(has(p.requiredFacts, /immediate actions/)); assert(has(p.requiredFacts, /disposition/));
}
// 12
{
  const { plan: p } = plan('Briefly prep me for tibial plateau ORIF', { mode: 'or_prep', depth: 'quick' });
  assert(p.requestedFormat.concise); assert(p.requiredFacts.length <= 7); assert(p.optionalSections.length <= 1);
}
// 13
{ const { plan: p } = plan('Just the answer: what is a Maisonneuve fracture?'); assert(p.requestedFormat.answerOnly); assert.equal(p.optionalSections.length, 0); }
// 14
{
  const { plan: p } = plan('Deep OR prep for a senior resident: tibial plateau ORIF', { mode: 'or_prep', depth: 'deep', level: 'pgy5' });
  assert(has(p.requiredFacts, /decision pivots/)); assert(has(p.requiredFacts, /complications/)); assert(has(p.requiredFacts, /bailouts/)); assert(has(p.requiredFacts, /alternative strategies/));
}
// 15
{
  const { plan: p } = plan('Attending-level current evidence and controversies for fixation', { level: 'attending' });
  assert(has(p.requiredFacts, /^evidence$|controversies/)); assert(p.evidenceQueries.length > 0);
}
// 16
{
  const { plan: p } = plan('Explain carpal tunnel syndrome', { selectedBranch: { id: 'old', label: 'Tibial plateau fixation options' } });
  assert.equal(p.task, 'explain'); assert(has(p.prohibitedContent, /stale selected branch/)); assert(!has(p.requiredFacts, /selected branch focus/));
}
// 17
{ let calls = 0; if (resolveBroBotAnswerPlannerMode(undefined) !== 'off') calls += 1; assert.equal(calls, 0); assert.equal(resolveBroBotAnswerPlannerMode('bogus'), 'off'); }
// 18 and 19
{
  assert.equal(resolveBroBotAnswerPlannerMode('shadow'), 'shadow'); assert.equal(resolveBroBotAnswerPlannerMode('enabled'), 'enabled');
  const { plan: p, input: i } = plan('Compare nail versus plate'); const validation = validateBroBotAnswerPlan(p, i);
  for (const featureMode of ['shadow', 'enabled'] as const) {
    const metadata = buildAnswerPlanTelemetry({ featureMode, factoredIntent: i.factoredIntent, plan: p, validation, derivationLatencyMs: 1, validationLatencyMs: 1 });
    assert(!('directAnswerObjective' in metadata)); assert(!('requiredFacts' in metadata)); assert(!('message' in metadata));
  }
}
// 20
{
  const { plan: p, input: i } = plan('Explain ankle fractures'); const validation = validateBroBotAnswerPlan(p, i);
  const metadata = buildAnswerPlanTelemetry({ featureMode: 'shadow', factoredIntent: i.factoredIntent, plan: p, validation, derivationLatencyMs: 1, validationLatencyMs: 1 });
  await assert.doesNotReject(recordAnswerPlanTelemetrySafely({ mode: 'shadow', metadata, record: async () => { throw new Error('telemetry unavailable'); } }));
}
// 21
{
  const value = input('Help me understand this', { mutateFactored: (factored) => { factored.task = 'invalid'; factored.setting = null; factored.confidence = Number.NaN; } });
  const p = buildBroBotAnswerPlan(value); assert.equal(p.sources.task, 'legacy_fallback'); assert.equal(p.sources.setting, 'legacy_fallback'); assert(p.requiredFacts.length > 0); assert.equal(p.confidence, 0.35);
}
// 22
{
  const internal: BroBotChatInternalResult = { conversationId: 'test-conversation', messageId: 'test-message', answer: 'answer', priorityPoints: [], knowledgeGaps: [], suggestedQuestions: [], tags: [], detectedMode: 'general', confidence: 0.8 };
  const { plan: p } = plan('Explain ankle fractures'); const future = { ...internal, answerPlan: p } as BroBotChatInternalResult;
  assert(!('answerPlan' in serializeLegacyResponse(future))); assert(!('answerPlan' in serializeWebResponseV2(internal)));
}

const samples: number[] = [];
const perfInput = input('Compare nail versus plate for distal femur fractures', { level: 'pgy4' });
for (let index = 0; index < 500; index += 1) { const started = performance.now(); buildBroBotAnswerPlan(perfInput); samples.push(performance.now() - started); }
samples.sort((a, b) => a - b); const p95 = samples[Math.floor(samples.length * 0.95)];
assert(p95 < 20, `answer-plan derivation p95 ${p95.toFixed(3)}ms exceeded 20ms`);
console.log(`answer-plan tests passed (22 semantic cases; derivation p95=${p95.toFixed(3)}ms)`);
