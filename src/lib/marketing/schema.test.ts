import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20260901185616_brobot_marketing_campaigns.sql', 'utf8');
for (const required of ['marketing_consent_at', 'lifecycle_emails_campaign_delivery_uidx', 'marketing_email_webhook_events', 'enable row level security', 'revoke all on table public.lifecycle_emails']) {
  assert.ok(sql.includes(required), `migration missing ${required}`);
}
assert.ok(sql.includes('security invoker'));
assert.ok(!sql.toLowerCase().includes('security definer'));
const quotaSql = readFileSync('supabase/migrations/20260926_190000_marketing_automation_quota.sql', 'utf8');
for (const required of ['reserve_marketing_email_delivery', 'claim_marketing_email_batch', 'complete_marketing_email_batch', 'pg_advisory_xact_lock', 'America/Los_Angeles', "interval '24 hours'", 'daily_count >= 50', 'same_day_count > 0', 'automation_batch_id', 'to service_role']) {
  assert.ok(quotaSql.includes(required), `quota migration missing ${required}`);
}
assert.ok(quotaSql.includes('campaign_key is not null'), 'only campaign sends count toward the marketing cap');
console.log('marketing schema tests passed');
