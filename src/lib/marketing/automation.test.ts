import assert from 'node:assert/strict';
import {
  isAuthorizedMarketingScheduler,
  isMarketingAutomationWindowOpen,
  marketingDailyQuotaStatus,
  marketingAutomationBlockReason,
} from './automation.ts';

const request = (authorization: string | null) => new Request('https://snap-ortho.com/api/marketing/automation/run', {
  method: 'POST',
  headers: authorization ? { authorization } : {},
});
assert.equal(isAuthorizedMarketingScheduler(request('Bearer secret'), 'secret'), true);
assert.equal(isAuthorizedMarketingScheduler(request('Bearer secretX'), 'secret'), false);
assert.equal(isAuthorizedMarketingScheduler(request('Bearer sécret'), 'secret'), false);
assert.equal(isAuthorizedMarketingScheduler(request('Bearer secret'), undefined), false);

assert.equal(isMarketingAutomationWindowOpen(new Date('2026-09-26T16:00:00Z')), true);
assert.equal(isMarketingAutomationWindowOpen(new Date('2026-09-26T15:00:00Z')), false);
const quota = marketingDailyQuotaStatus([
  { user_id: 'one', campaign_key: 'activation', sent_at: '2026-09-26T16:00:00Z' },
  { user_id: 'two', campaign_key: null, sent_at: '2026-09-26T16:00:00Z' },
  { user_id: 'three', campaign_key: 'activation', sent_at: '2026-09-27T01:00:00Z' },
], new Date('2026-09-26T18:00:00Z'));
assert.equal(quota.dailySent, 2, 'quota day follows Pacific local midnight');
assert.equal(quota.dailyRemaining, 48);
assert.equal(quota.usersSentToday.has('one'), true);

const ready = {
  automationEnabled: true,
  sendEnabled: true,
  deliveryHealthApproved: true,
  quotaApproved: true,
  schedulerSecretConfigured: true,
  deliveries: [{ send_status: 'delivered', sent_at: new Date().toISOString(), delivered_at: new Date().toISOString() }],
  pendingWebhookCount: 0,
};
assert.equal(marketingAutomationBlockReason({ ...ready, automationEnabled: false }), 'automation_disabled');
assert.equal(marketingAutomationBlockReason({ ...ready, deliveryHealthApproved: false }), 'delivery_health_not_approved');
assert.equal(marketingAutomationBlockReason({ ...ready, quotaApproved: false }), 'daily_quota_not_approved');
assert.equal(marketingAutomationBlockReason({ ...ready, deliveries: [] }), 'delivery_health_data_missing');
assert.equal(marketingAutomationBlockReason({ ...ready, pendingWebhookCount: 1 }), 'webhook_processing_incomplete');
assert.equal(marketingAutomationBlockReason({ ...ready, webhookFailureCount: 1 }), 'webhook_processing_failed');
assert.equal(marketingAutomationBlockReason({
  ...ready,
  deliveries: [{ send_status: 'delivered', sent_at: '2026-09-26T16:00:00Z', delivered_at: '2026-09-26T16:00:00Z' }],
  now: Date.parse('2026-09-27T15:00:00Z'),
}), 'minimum_24_hour_batch_interval');
assert.equal(marketingAutomationBlockReason({
  ...ready,
  deliveries: [{ send_status: 'delivered', sent_at: '2026-09-26T16:00:00Z', delivered_at: '2026-09-26T16:00:00Z' }],
  now: Date.parse('2026-09-27T16:00:00Z'),
}), null);
assert.equal(marketingAutomationBlockReason({ ...ready, deliveries: [{ ...ready.deliveries[0], complained_at: new Date().toISOString() }] }), 'delivery_quality_event');
assert.equal(marketingAutomationBlockReason({
  ...ready,
  deliveries: [{ send_status: 'sending', sent_at: '2026-09-25T00:00:00Z' }],
}), 'ambiguous_delivery_unresolved');
assert.equal(marketingAutomationBlockReason({
  ...ready,
  deliveries: [{ send_status: 'sent', sent_at: '2026-09-25T00:00:00Z' }],
  now: Date.parse('2026-09-26T02:00:00Z'),
}), 'delivery_confirmation_missing');
assert.equal(marketingAutomationBlockReason({ ...ready, now: Date.now() + 25 * 60 * 60_000 }), null);
console.log('Marketing scheduler authorization, Pacific window, and fail-closed health checks passed.');
