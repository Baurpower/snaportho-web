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
assert.deepEqual(selectBroBotResponseContract(new Headers({ 'X-BroBot-Response-Version': '  ' })), {
  ok: false,
  requestedVersion: '(empty)',
});

assert.equal(shouldStreamBroBotResponse({ contract: 'legacy', requested: true, serverEnabled: true }), false);
assert.equal(shouldStreamBroBotResponse({ contract: 'web_v2', requested: true, serverEnabled: false }), true);
assert.equal(shouldStreamBroBotResponse({ contract: 'web_v2', requested: false, serverEnabled: true }), true);

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

console.log('BroBot response contract tests passed');
