/**
 * Applies 20260630_180000_stripe_resubscribe_history.sql to the configured database.
 * Safe to re-run (idempotent DDL).
 *
 * Usage:
 *   node --experimental-strip-types scripts/apply-stripe-resubscribe-migration.ts
 *   node --experimental-strip-types scripts/apply-stripe-resubscribe-migration.ts --dry-run
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

import { resolveOperatorDatabaseUrl } from '../src/lib/datastore/connection-url.ts';

function loadDotEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

async function listSubscriptionIndexes(client: pg.Client) {
  const { rows } = await client.query<{ indexname: string; indexdef: string }>(`
    select indexname, indexdef
    from pg_indexes
    where schemaname = 'public' and tablename = 'subscriptions'
    order by indexname
  `);
  return rows;
}

async function main() {
  loadDotEnvLocal();
  const dryRun = process.argv.includes('--dry-run');
  const { url: databaseUrl } = resolveOperatorDatabaseUrl();

  const migrationPath = join(
    process.cwd(),
    'supabase/migrations/20260630_180000_stripe_resubscribe_history.sql'
  );
  const sql = readFileSync(migrationPath, 'utf8');

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const before = await listSubscriptionIndexes(client);
    const hadLegacyIndex = before.some((row) => row.indexname === 'subscriptions_user_provider_idx');

    console.log(JSON.stringify({ phase: 'before', hadLegacyIndex, indexes: before.map((r) => r.indexname) }, null, 2));

    if (dryRun) {
      console.log('Dry run — migration SQL not executed.');
      return;
    }

    await client.query(sql);

    const after = await listSubscriptionIndexes(client);
    const stillHasLegacyIndex = after.some((row) => row.indexname === 'subscriptions_user_provider_idx');
    const hasActiveGuard = after.some((row) => row.indexname === 'subscriptions_one_active_per_user_provider');
    const hasLookupIdx = after.some((row) => row.indexname === 'subscriptions_user_provider_lookup_idx');

    console.log(
      JSON.stringify(
        {
          phase: 'after',
          migrationApplied: true,
          legacyIndexRemoved: hadLegacyIndex && !stillHasLegacyIndex,
          stillHasLegacyIndex,
          hasActiveGuard,
          hasLookupIdx,
          indexes: after.map((r) => r.indexname),
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});