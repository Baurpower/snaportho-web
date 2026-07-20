import assert from 'node:assert/strict';

import { resolveBroBotEntities } from './entity-resolution';
import {
  getBroBotTierExecutionPolicy,
  resolveBroBotResponseTier,
  shouldIncludeResidentsMissSection,
} from './tier-router';
import type { BroBotChatSubintent } from './types';
import type { BroBotChatMode } from './types';
import { runTierAwareAnswerIntegrityChecks } from './tier-quality';
import { buildBroBotTier1Messages } from './prompt-builder';

function tier(message: string, subintent: BroBotChatSubintent, mode: BroBotChatMode = 'general') {
  return resolveBroBotResponseTier({
    message,
    mode,
    subintent,
    responseDepth: 'standard',
    entityResolution: resolveBroBotEntities(message),
  });
}

assert.equal(tier('What is the Garden classification?', 'classification'), 1);
assert.equal(tier('What nerve innervates the APB?', 'anatomy_at_risk'), 1);
assert.equal(tier('What are the indications for EIP to APB tendon transfer?', 'indications'), 1);
assert.equal(tier('What are the indications for EIP to APB tendon transfer?', 'indications', 'or_prep'), 1);
assert.equal(tier('How should I treat this unstable ankle fracture?', 'treatment_plan'), 2);
assert.equal(tier('Open tibia with a pulseless foot', 'urgent_red_flags', 'consult'), 2);
assert.equal(tier('Distal radius ORIF tomorrow—full prep', 'surgical_steps', 'or_prep'), 3);
assert.equal(tier('Pimp me on total hip arthroplasty', 'attending_questions'), 3);

const eipApb = resolveBroBotEntities('What are the indications for EIP to APB tendon transfer?');
assert.equal(eipApb.state, 'resolved');
assert.equal(eipApb.specialty, 'hand_surgery');
assert.match(eipApb.relationship ?? '', /EIP opponensplasty/);
assert.deepEqual(eipApb.entities.map((entity) => entity.abbreviation), ['EIP', 'APB']);
const eipPrompt = buildBroBotTier1Messages({
  message: 'What are the indications for EIP to APB tendon transfer?',
  trainingLevel: 'pgy2',
  subintent: 'indications',
  procedureOrTopic: eipApb.resolvedTopic,
  entityResolution: eipApb,
});
assert.match(eipPrompt[0].content, /EIP opponensplasty/);
assert.match(eipPrompt[0].content, /Do not list ulnar nerve palsy as the primary indication/);

const ambiguousIp = resolveBroBotEntities('What does IP mean?');
assert.equal(ambiguousIp.state, 'ambiguous');
assert.match(ambiguousIp.clarifyingQuestion ?? '', /thumb IP, PIP, or DIP/);

const ambiguousPair = resolveBroBotEntities('EIP APB?');
assert.equal(ambiguousPair.state, 'ambiguous');
assert.match(ambiguousPair.clarifyingQuestion ?? '', /anatomy, examination, injury, or tendon transfer/);

assert.equal(
  shouldIncludeResidentsMissSection({
    message: 'Full OR prep',
    tier: 3,
    mode: 'or_prep',
    responseDepth: 'standard',
  }),
  false
);
assert.equal(
  shouldIncludeResidentsMissSection({
    message: 'What do residents miss?',
    tier: 3,
    mode: 'or_prep',
    responseDepth: 'standard',
  }),
  true
);

const tierOnePolicy = getBroBotTierExecutionPolicy(1);
assert.equal(tierOnePolicy.maxAnswerModelCalls, 1);
assert.equal(tierOnePolicy.blockingMetadataModelCalls, 0);
assert.equal(tierOnePolicy.blockingRevisionModelCalls, 0);
assert.equal(tierOnePolicy.certifiedContext, false);
assert.equal(tierOnePolicy.kgOnAnswerPath, false);
assert.equal(tierOnePolicy.maxOutputTokens, 250);

assert.deepEqual(
  runTierAwareAnswerIntegrityChecks({
    tier: 2,
    question: 'Open fracture with a pulseless foot',
    answer: 'Obtain radiographs and reassess later.',
    entityResolution: resolveBroBotEntities('Open fracture with a pulseless foot'),
  }).includes('urgent_escalation_guidance_missing'),
  true
);

console.log('BroBot tier router and entity-resolution fixtures passed.');
