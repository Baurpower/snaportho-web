import assert from 'node:assert/strict';

import { centsToRoundedDollars, donorDisplayName, mapDonationRowToListItem } from './display.ts';

assert.equal(donorDisplayName({ display_name: 'Alex', anonymous: false }), 'Alex');
assert.equal(donorDisplayName({ display_name: '', anonymous: false }), 'Anonymous');
assert.equal(donorDisplayName({ display_name: 'Alex', anonymous: true }), 'Anonymous');
assert.equal(centsToRoundedDollars(500), 5);
assert.equal(centsToRoundedDollars(550), 6);

const item = mapDonationRowToListItem({
  id: '1',
  billing_name: 'Alex Baur',
  display_name: 'Alex',
  anonymous: false,
  email: 'alex@example.com',
  message: 'Go team',
  amount: 2500,
  stripe_id: 'pi_123',
  stripe_event_id: 'evt_123',
  status: 'paid',
  created_at: '2026-02-25T01:48:27Z',
});

assert.equal(item.name, 'Alex');
assert.equal(item.amount, 25);
assert.equal(item.note, 'Go team');
assert.equal(item.via, 'Stripe');

console.log('donations display tests passed');