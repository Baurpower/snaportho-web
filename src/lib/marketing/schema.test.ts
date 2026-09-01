import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20260901185616_brobot_marketing_campaigns.sql', 'utf8');
for (const required of ['marketing_consent_at', 'lifecycle_emails_campaign_delivery_uidx', 'marketing_email_webhook_events', 'enable row level security', 'revoke all on table public.lifecycle_emails']) {
  assert.ok(sql.includes(required), `migration missing ${required}`);
}
assert.ok(sql.includes('security invoker'));
assert.ok(!sql.toLowerCase().includes('security definer'));
console.log('marketing schema tests passed');
