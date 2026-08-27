/**
 * Applies 20260827_150000_lifecycle_emails.sql to the configured database.
 * Safe to re-run (idempotent DDL).
 *
 * Usage:
 *   node --experimental-strip-types scripts/apply-lifecycle-emails-migration.ts
 *   node --experimental-strip-types scripts/apply-lifecycle-emails-migration.ts --dry-run
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

async function main() {
  loadDotEnvLocal();
  const dryRun = process.argv.includes('--dry-run');
  const { url: databaseUrl } = resolveOperatorDatabaseUrl();

  const migrationPath = join(
    process.cwd(),
    'supabase/migrations/20260827_150000_lifecycle_emails.sql',
  );
  const sql = readFileSync(migrationPath, 'utf8');

  if (dryRun) {
    console.log(`[dry-run] would apply ${migrationPath} (${sql.length} bytes)`);
    return;
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query<{ tablename: string }>(`
      select tablename from pg_tables
      where schemaname = 'public'
        and tablename in ('lifecycle_emails', 'lifecycle_email_optouts')
      order by tablename
    `);
    console.log('applied. tables present:', rows.map((r) => r.tablename).join(', '));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
