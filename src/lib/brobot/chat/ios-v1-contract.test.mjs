import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isIosV1SupportedSubintent,
  serializeBroBotIntentForClient,
} from './ios-v1-contract.ts';

const fixture = JSON.parse(
  readFileSync(
    new URL('../../../../fixtures/brobot-contract/production-ios-v1-intent-cubital-tunnel.sanitized.json', import.meta.url),
    'utf8'
  )
);

const productionResponse = fixture.productionResponse;
assert.equal(productionResponse.subintent, 'surgical_approach');
assert.equal(isIosV1SupportedSubintent(productionResponse.subintent), false);

const iosV1Response = serializeBroBotIntentForClient(productionResponse, 'v1');
assert.equal(iosV1Response.subintent, 'landmarks');
assert.equal(isIosV1SupportedSubintent(iosV1Response.subintent), true);

assert.deepEqual(
  serializeBroBotIntentForClient(productionResponse, null),
  productionResponse,
  'unversioned web intent behavior must remain unchanged'
);

assert.equal(
  serializeBroBotIntentForClient({ subintent: 'future_backend_case' }, 'v1').subintent,
  'other',
  'future backend enum cases must remain decodable by the shipped v1 client'
);

console.log('BroBot iOS v1 intent compatibility tests passed.');
