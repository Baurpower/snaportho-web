import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260823_140000_brobot_product_analytics_foundation.sql'),
  'utf8'
);

assert.match(migration, /caseprep_version in \('v1\.2', 'v1\.3'\)/);
assert.match(migration, /create table if not exists public\.product_events/);
assert.match(migration, /enable row level security/);
assert.match(migration, /force row level security/);
assert.match(migration, /with \(security_invoker = true\)/);
assert.match(migration, /product_events_first_success_user_uidx/);

console.log('BroBot product analytics schema tests passed');
