/** Export non-source run identity/state needed to rebuild a missing transient packet. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function loadEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const clean = line.trim(); if (!clean || clean.startsWith('#') || !clean.includes('=')) return [];
    const at = clean.indexOf('='); return [[clean.slice(0, at).trim(), clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')]];
  }));
}
const arg = (name: string) => process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
const runId = arg('--run-id'); const outDir = arg('--out');
if (!runId || !outDir) throw new Error('usage: --run-id=UUID --out=empty-directory');
const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
mkdirSync(outDir, { recursive: true });
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const runResult = await db.query(`select id, status, expected_count, completed_count, release_sha, packet_sha256,
    execution_manifest, pricing_profile, started_at, completed_at from public.ob_claim_production_runs where id=$1`, [runId]);
  if (runResult.rows.length !== 1) throw new Error('run not found');
  const items = await db.query(`select native_question_id, specialty, status, attempt_count, max_attempts,
    source_fingerprint_hash, live_attempt_id, last_diagnostic, reason_codes
    from public.ob_claim_production_items where run_id=$1
    order by case when native_question_id ~ '^[0-9]+$' then native_question_id::bigint end nulls last, native_question_id`, [runId]);
  const manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), run: runResult.rows[0], questions: items.rows };
  writeFileSync(path.join(outDir, 'recovery-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  writeFileSync(path.join(outDir, 'qids.txt'), `${items.rows.map((row) => row.native_question_id).join('\n')}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ event: 'recovery_manifest_exported', runId, outDir: path.resolve(outDir), questions: items.rows.length }));
} finally { await db.end(); }
