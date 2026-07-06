import assert from 'node:assert/strict';

import { mapDonationRowToListItem } from '../../../lib/donations/display.ts';

function buildDonationsResponse(rows: Array<ReturnType<typeof sampleRow>>) {
  const donations = rows.map((row) => mapDonationRowToListItem(row));
  const sumCents = rows.reduce((sum, row) => sum + row.amount, 0);
  return {
    source: 'db:donations:supabase',
    donations,
    totals: {
      sumCents,
      sumDollars: Math.floor((sumCents + 50) / 100),
      count: rows.length,
    },
  };
}

function sampleRow(overrides: Partial<ReturnType<typeof baseRow>> = {}) {
  return { ...baseRow(), ...overrides };
}

function baseRow() {
  return {
    id: '1',
    billing_name: 'Donor',
    display_name: 'Donor',
    anonymous: false,
    email: 'donor@example.com',
    message: null,
    amount: 1000,
    stripe_id: 'pi_1',
    stripe_event_id: 'evt_1',
    status: 'paid',
    created_at: '2026-02-25T01:48:27Z',
  };
}

const payload = buildDonationsResponse([
  sampleRow({ amount: 500 }),
  sampleRow({ id: '2', amount: 1500, display_name: 'Patron' }),
]);

assert.equal(payload.totals.sumCents, 2000);
assert.equal(payload.totals.count, 2);
assert.equal(payload.donations[1].name, 'Patron');
assert.equal(payload.source, 'db:donations:supabase');

console.log('donations route mapping tests passed');