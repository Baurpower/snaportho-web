/**
 * Applies 20260830_130000_anki_resource_field_overlay.sql to the configured database.
 * Idempotent DDL (create table/index if not exists). Safe to re-run.
 *
 * Usage:
 *   node --experimental-strip-types scripts/apply-anki-resource-field-overlay-migration.ts --dry-run
 *   node --experimental-strip-types scripts/apply-anki-resource-field-overlay-migration.ts --apply
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { resolveOperatorDatabaseUrl } from '../src/lib/datastore/connection-url.ts';

const MIGRATION = '20260830_130000_anki_resource_field_overlay.sql';

async function main() {
  const apply = process.argv.includes('--apply');
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8');
  if (!apply) {
    console.log(`[dry-run] would apply ${MIGRATION} (${sql.length} bytes). Pass --apply to run.`);
    return;
  }
  const { url, host, provider } = resolveOperatorDatabaseUrl();
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    const { rows } = await client.query(
      `select table_name from information_schema.tables
       where table_schema='public' and table_name in
       ('anki_resource_field_overlays','anki_resource_field_overlay_cards') order by table_name`,
    );
    console.log(JSON.stringify({ applied: MIGRATION, provider, host, tables: rows.map((r) => r.table_name) }, null, 2));
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
