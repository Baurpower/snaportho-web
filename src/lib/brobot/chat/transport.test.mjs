import assert from 'node:assert/strict';

import { shouldStreamBroBotResponse } from './transport.ts';

const shippedIosCubitalTunnelRequest = JSON.parse(JSON.stringify({
  conversationId: null,
  message: 'What is the incision for cubital tunnel release?',
  mode: 'auto',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
  source: 'manual',
  stream: false,
}));

assert.equal(
  shouldStreamBroBotResponse({
    contract: 'legacy',
    requestedStream: shippedIosCubitalTunnelRequest.stream,
    serverStreamingEnabled: true,
  }),
  false,
  'the backend rollout flag must not replace the shipped iOS JSON response with SSE'
);

assert.equal(
  shouldStreamBroBotResponse({
    contract: 'legacy',
    requestedStream: true,
    serverStreamingEnabled: false,
  }),
  true,
  'an explicit streaming request must continue to receive SSE'
);

assert.equal(
  shouldStreamBroBotResponse({
    contract: 'web_v2',
    requestedStream: undefined,
    serverStreamingEnabled: true,
  }),
  true,
  'an omitted preference must retain the web_v2 rollout behavior'
);

assert.equal(
  shouldStreamBroBotResponse({
    contract: 'legacy',
    requestedStream: undefined,
    serverStreamingEnabled: true,
  }),
  false,
  'an omitted preference must retain JSON for the legacy response contract'
);

console.log('BroBot transport compatibility tests passed.');
