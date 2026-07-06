/**
 * Apply RDS cutover migrations (donations, case_prep_logs) to production Supabase.
 * Uses DATABASE_URL / SUPABASE_DATABASE_URL from .env.local.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Client } = pg;

function hydrateDotEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  hydrateDotEnvLocal();
  const url = process.env.SUPABASE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('Missing DATABASE_URL');

  const migrations = [
    'supabase/migrations/20260705_140000_donations.sql',
    'supabase/migrations/20260705_141000_case_prep_logs.sql',
  ];

  const client = new Client({ connectionString: url });
  await client.connect();

  const applied: string[] = [];
  try {
    for (const file of migrations) {
      const sql = readFileSync(join(process.cwd(), file), 'utf8');
      await client.query(sql);
      applied.push(file);
      console.log('[apply-rds-cutover-migrations] applied', file);
    }

    const verify = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('donations', 'case_prep_logs')
      ORDER BY table_name
    `);
    console.log(
      JSON.stringify(
        {
          appliedAt: new Date().toISOString(),
          applied,
          tablesPresent: verify.rows.map((r) => r.table_name),
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
  console.error('[apply-rds-cutover-migrations] failed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});