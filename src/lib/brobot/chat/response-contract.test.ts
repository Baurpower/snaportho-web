import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Node's type-stripping runner requires the source extension; the app tsconfig does not enable it.
// @ts-expect-error -- Node's runner needs the extension; the app tsconfig intentionally disallows it.
import * as responseContract from './response-contract.ts';
import type { BroBotChatInternalResult } from './response-contract';

const {
  selectBroBotResponseContract,
  serializeLegacyResponse,
  serializeWebResponseV2,
  shouldStreamBroBotResponse,
  shouldUseCasePrepV2Migration,
  encodeBroBotStreamEvent,
  BROBOT_LEGACY_RESPONSE_KEYS,
  BROBOT_LEGACY_BRANCH_KEYS,
} = responseContract;

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'fixtures/brobot-contract', name), 'utf8'));

const internal: BroBotChatInternalResult = {
  conversationId: 'conversation-fixture',
  messageId: 'message-fixture',
  answer: 'A sanitized BroBot answer.',
  priorityPoints: [],
  knowledgeGaps: [],
  suggestedQuestions: [],
  tags: [],
  detectedMode: 'general',
  remainingFreeUses: null,
};

assert.deepEqual(serializeLegacyResponse(internal), fixture('legacy-success.json'));
assert.deepEqual(serializeWebResponseV2(internal), fixture('web-v2-success.json'));
assert.equal(serializeLegacyResponse(internal).answer, serializeWebResponseV2(internal).answer);
assert.equal('responseVersion' in serializeLegacyResponse(internal), false);
assert.deepEqual(Object.keys(serializeLegacyResponse(internal)).sort(), Object.keys(fixture('legacy-success.json')).sort());
for (const key of ['conversationId', 'messageId', 'answer', 'priorityPoints', 'knowledgeGaps', 'suggestedQuestions', 'tags', 'detectedMode']) {
  assert.ok(BROBOT_LEGACY_RESPONSE_KEYS.includes(key as never), `legacy key allowlist must include ${key}`);
}

const internalWithFutureFields = { ...internal, responseVersion: 999, citations: [{ title: 'web only' }] };
const futureSafeLegacy = serializeLegacyResponse(internalWithFutureFields as BroBotChatInternalResult);
assert.equal('responseVersion' in futureSafeLegacy, false);
assert.equal('citations' in futureSafeLegacy, false, 'new internal fields must not alter legacy decoding');
assert.equal((serializeWebResponseV2(internalWithFutureFields as BroBotChatInternalResult) as Record<string, unknown>).responseVersion, 2);

assert.deepEqual(selectBroBotResponseContract(new Headers()), {
  ok: true,
  contract: 'legacy',
  clientPlatform: 'unknown',
});
assert.deepEqual(
  selectBroBotResponseContract(new Headers({ 'X-BroBot-Response-Version': '2', 'X-SnapOrtho-Client': 'web' })),
  { ok: true, contract: 'web_v2', clientPlatform: 'web' }
);
assert.deepEqual(selectBroBotResponseContract(new Headers({ 'X-BroBot-Response-Version': '99' })), {
  ok: false,
  requestedVersion: '99',
});
assert.deepEqual(selectBroBotResponseContract(new Headers({ 'X-BroBot-Response-Version': '1', 'X-SnapOrtho-Client': 'ios' })), {
  ok: true,
  contract: 'legacy',
  clientPlatform: 'ios',
});
assert.deepEqual(selectBroBotResponseContract(new Headers({ 'X-BroBot-Response-Version': '  ' })), {
  ok: false,
  requestedVersion: '(empty)',
});

assert.equal(shouldStreamBroBotResponse({ contract: 'legacy', requested: true, serverEnabled: true }), false);
assert.equal(shouldStreamBroBotResponse({ contract: 'web_v2', requested: true, serverEnabled: false }), true);
assert.equal(shouldStreamBroBotResponse({ contract: 'web_v2', requested: false, serverEnabled: true }), true);

const clarification = serializeLegacyResponse({
  ...internal,
  answer: 'Which procedure do you mean?',
  needsClarification: true,
  clarifyingQuestions: ['Open or endoscopic release?'],
});
assert.equal(clarification.needsClarification, true);
assert.deepEqual(clarification.clarifyingQuestions, ['Open or endoscopic release?']);
assert.equal('responseVersion' in clarification, false);

const branchSelection = serializeLegacyResponse({
  ...internal,
  selectedFocus: 'Anatomy at risk',
  nextLearningBranches: [{ id: 'anatomy', label: 'Anatomy at risk', rankScore: 42 }],
});
assert.equal(branchSelection.selectedFocus, 'Anatomy at risk');
assert.equal(branchSelection.nextLearningBranches?.[0]?.id, 'anatomy');
assert.equal(branchSelection.nextLearningBranches?.[0]?.rankScore, 42, 'already-shipped legacy branch fields remain unchanged');
assert.ok(BROBOT_LEGACY_BRANCH_KEYS.includes('rankScore'));

const branchWithFutureFields = serializeLegacyResponse({
  ...internal,
  nextLearningBranches: [{
    id: 'anatomy', label: 'Anatomy at risk', rankScore: 42,
    canonicalPrompt: 'Internal prompt', provenance: ['model'], safetyWarnings: [],
  } as never],
});
const serializedLegacyBranch = branchWithFutureFields.nextLearningBranches?.[0] as Record<string, unknown>;
assert.equal('canonicalPrompt' in serializedLegacyBranch, false);
assert.equal('provenance' in serializedLegacyBranch, false);
assert.equal('safetyWarnings' in serializedLegacyBranch, false);

const quota = serializeLegacyResponse({ ...internal, remainingFreeUses: 0 });
assert.equal(quota.remainingFreeUses, 0);
assert.deepEqual(fixture('legacy-error.json'), fixture('web-v2-error.json'), 'error JSON remains version-agnostic');

const withoutOptionalMetadata = { ...internal };
assert.deepEqual(serializeLegacyResponse(withoutOptionalMetadata), fixture('legacy-success.json'));

assert.equal(
  shouldUseCasePrepV2Migration('legacy', 'What is the incision for carpal tunnel release?'),
  false
);
assert.equal(
  shouldUseCasePrepV2Migration('web_v2', 'What is the incision for carpal tunnel release?'),
  true
);
assert.equal(
  shouldUseCasePrepV2Migration('legacy', 'What is the incision for cubital tunnel release?'),
  false
);
assert.equal(
  shouldUseCasePrepV2Migration('web_v2', 'What is the incision for cubital tunnel release?'),
  false
);

const streamTranscript = [
  encodeBroBotStreamEvent('start', {
    assistantMessageId: internal.messageId,
    conversationId: internal.conversationId,
  }),
  encodeBroBotStreamEvent('delta', { content: internal.answer }),
  encodeBroBotStreamEvent('metadata', serializeWebResponseV2(internal)),
  encodeBroBotStreamEvent('done', {
    assistantMessageId: internal.messageId,
    conversationId: internal.conversationId,
  }),
].join('');
assert.equal(
  streamTranscript,
  `${readFileSync(join(process.cwd(), 'fixtures/brobot-contract/web-v2-stream.txt'), 'utf8')}\n`
);

assert.deepEqual(fixture('legacy-error.json'), fixture('web-v2-error.json'));

for (const webClient of [
  'src/components/brobot/BroBotChatPage.tsx',
  'src/app/brobot/basic/page.tsx',
  'src/app/brobot/brobotmember.tsx',
]) {
  const source = readFileSync(join(process.cwd(), webClient), 'utf8');
  assert.match(source, /X-BroBot-Response-Version['"]?:\s*['"]2['"]/);
  assert.match(source, /X-SnapOrtho-Client['"]?:\s*['"]web['"]/);
}

const webChatSource = readFileSync(
  join(process.cwd(), 'src/components/brobot/BroBotChatPage.tsx'),
  'utf8'
);
assert.match(
  webChatSource,
  /NEXT_PUBLIC_BROBOT_STREAMING_ENABLED\s*!==\s*['"]false['"]/,
  'the website chat should stream by default while retaining an emergency false kill switch'
);
assert.match(webChatSource, /stream:\s*Boolean\(streamingAssistantId\)/);
assert.match(webChatSource, /text\/event-stream/);

console.log('BroBot response contract tests passed');
