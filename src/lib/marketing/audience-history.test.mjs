import assert from 'node:assert/strict';
import { campaignActivity, campaignHistory } from './audience-history.ts';
const created='2026-01-01T00:00:00Z', updated='2026-09-01T00:00:00Z';
const activity=campaignActivity([{user_id:'u',created_at:created,updated_at:updated}]).get('u');
assert.equal(Math.min(...activity),Date.parse(created),'Reopening a conversation must not reset first use');
assert.equal(Math.max(...activity),Date.parse(updated));
const history=campaignHistory([
 {user_id:'u',campaign_step:'activation_1',send_status:'sending',sent_at:created},
 {user_id:'v',campaign_step:'activation_1',send_status:'delivered',sent_at:created},
 {user_id:'w',campaign_step:'activation_1',send_status:'failed',sent_at:created},
]);
assert.equal(history.attempted.get('u').has('activation_1'),true);
assert.equal(history.prior.has('u'),false,'An unresolved send cannot unlock follow-up emails');
assert.equal(history.prior.get('v').get('activation_1'),Date.parse(created));
assert.equal(history.attempted.has('w'),false);
console.log('Campaign first-use and prerequisite history tests passed.');
