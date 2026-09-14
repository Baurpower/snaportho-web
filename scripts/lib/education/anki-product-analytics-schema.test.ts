import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

const migration = read('supabase/migrations/20260912_120000_anki_product_analytics.sql');
assert.match(migration, /product_events_anki_first_download_user_uidx/);
assert.match(migration, /product_events_anki_opened_user_day_uidx/);
assert.match(migration, /analytics\.anki_daily_funnel/);
assert.match(migration, /analytics\.anki_daily_active/);
assert.match(migration, /analytics\.anki_linked_devices/);
assert.match(migration, /analytics\.anki_activation/);
assert.match(migration, /analytics\.anki_retention_cohorts/);
assert.match(migration, /security_invoker = true/);
assert.match(migration, /grant select on analytics\.anki_daily_funnel to service_role/);
assert.match(migration, /No card content/);
assert.doesNotMatch(migration, /create table .*anki_card_text|review_log|personal_notes/i);

const events = read('src/lib/analytics/product-events.ts');
for (const name of [
  'anki_landing_viewed',
  'anki_addon_downloaded',
  'anki_addon_first_downloaded',
  'anki_device_linked',
  'anki_addon_opened',
  'anki_deck_imported',
  'anki_deck_update_applied',
  'anki_brobot_prompt_used',
  'anki_setup_failed',
]) {
  assert.match(events, new RegExp(`'${name}'`));
}
assert.match(events, /export type ProductArea = .*'anki'/);

const download = read('src/app/api/anki/addon/download/route.ts');
assert.match(download, /anki_addon_downloaded/);
assert.match(download, /anki_addon_first_downloaded/);
assert.match(download, /download_unavailable/);
assert.match(download, /Unable to record Anki add-on download/);

const landing = read('src/components/analytics/AnkiTrafficTracker.tsx');
assert.match(landing, /anki_landing_viewed/);

const clientEvents = read('src/app/api/analytics/events/route.ts');
assert.match(clientEvents, /anki_landing_viewed/);
assert.match(clientEvents, /startsWith\('anki_'\)/);

const poll = read('src/app/api/brobot-anki/auth/poll-link/route.ts');
assert.match(poll, /anki_device_linked/);

const bootstrap = read('src/app/api/anki/deck/releases/[id]/artifact/bootstrap_apkg/route.ts');
assert.match(bootstrap, /anki_deck_imported/);
assert.match(bootstrap, /recordAnkiProductEvent/);
assert.doesNotMatch(bootstrap, /\.insert\(|\.update\(|\.delete\(/);

const ack = read('src/app/api/anki/deck/sync/ack/route.ts');
assert.match(ack, /anki_deck_update_applied/);
assert.doesNotMatch(ack, /canonical_cards|canonical_card_versions/);

const chat = read('src/app/api/brobot-anki/chat/route.ts');
assert.match(chat, /anki_brobot_prompt_used/);
assert.match(chat, /classifyAnkiBroBotPrompt/);
assert.match(chat, /prompt_kind/);
assert.match(chat, /prompt_kind: classifyAnkiBroBotPrompt\(body\.message\)/);
assert.doesNotMatch(chat, /properties: \{[^}]*\bmessage:/);

const heartbeat = read('src/app/api/anki/addon/heartbeat/route.ts');
assert.match(heartbeat, /anki_addon_opened/);
assert.match(heartbeat, /device authentication required/);
assert.match(heartbeat, /brobot_anki_addon_devices/);
assert.doesNotMatch(heartbeat, /card front|review history|personal notes/i);

const adminApi = read('src/app/api/admin/anki-usage/route.ts');
assert.match(adminApi, /requireCasePrepReviewer\(\{ minRole: 'content_admin' \}\)/);
assert.match(adminApi, /loadAnkiUsageSnapshot/);

const adminPage = read('src/app/admin/anki-usage/page.tsx');
assert.match(adminPage, /AnkiUsageDashboard/);
assert.match(adminPage, /content_admin/);

console.log('anki product analytics schema and wiring tests passed');
