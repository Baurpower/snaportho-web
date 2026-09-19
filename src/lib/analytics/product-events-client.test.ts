import assert from 'node:assert/strict';

import { attributionFromSearch, attributionProperties } from './product-events-client';

const parsed = attributionFromSearch(
  '?utm_source=google&utm_medium=cpc&utm_campaign=brobot_search_us' +
    '&utm_term=orthopedic%20ai&utm_content=resident_rsa' +
    '&gclid=test-gclid&gbraid=test-gbraid&wbraid=test-wbraid&_branch_match_id=branch-1'
);

assert.deepEqual(parsed, {
  source: 'google',
  medium: 'cpc',
  campaign: 'brobot_search_us',
  utmTerm: 'orthopedic ai',
  utmContent: 'resident_rsa',
  gclid: 'test-gclid',
  gbraid: 'test-gbraid',
  wbraid: 'test-wbraid',
  branchClickId: 'branch-1',
});

assert.deepEqual(attributionProperties(parsed), {
  utm_term: 'orthopedic ai',
  utm_content: 'resident_rsa',
  gclid: 'test-gclid',
  gbraid: 'test-gbraid',
  wbraid: 'test-wbraid',
});

assert.deepEqual(attributionFromSearch(''), {
  source: null,
  medium: null,
  campaign: null,
  utmTerm: null,
  utmContent: null,
  gclid: null,
  gbraid: null,
  wbraid: null,
  branchClickId: null,
});

console.log('product event attribution tests passed');
