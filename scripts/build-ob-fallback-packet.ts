/** Build a new immutable packet containing only currently nonterminal items from a prior run. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const TERMINAL = new Set(['accepted', 'ai_review_unresolved', 'identity_unresolved', 'identity_conflict', 'failed_permanent']);
function loadEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const clean = line.trim(); if (!clean || clean.startsWith('#') || !clean.includes('=')) return [];
    const at = clean.indexOf('='); return [[clean.slice(0, at).trim(), clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')]];
  }));
}
const arg = (name: string) => process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
const runId = arg('--run-id'); const inputPath = arg('--input'); const outPath = arg('--out');
if (!runId || !inputPath || !outPath) throw new Error('usage: --run-id=UUID --input=full-packets.json --out=new-fallback-packets.json');
const inputText = readFileSync(inputPath, 'utf8');
const packets = JSON.parse(inputText) as Array<{ nativeQuestionId: string }>;
const byQid = new Map(packets.map((row) => [row.nativeQuestionId, row]));
if (byQid.size !== packets.length) throw new Error('input contains duplicate qids');
const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const result = await db.query(`select native_question_id, status from public.ob_claim_production_items
    where run_id=$1 order by case when native_question_id ~ '^[0-9]+$' then native_question_id::bigint end nulls last, native_question_id`, [runId]);
  if (!result.rows.length) throw new Error('run has no items');
  const remaining = result.rows.filter((row) => !TERMINAL.has(row.status));
  const missing = remaining.map((row) => row.native_question_id).filter((qid) => !byQid.has(qid));
  if (missing.length) throw new Error(`full packet is missing ${missing.length} remaining qids`);
  const selected = remaining.map((row) => byQid.get(row.native_question_id));
  const body = `${JSON.stringify(selected)}\n`;
  writeFileSync(outPath, body, { flag: 'wx' });
  console.log(JSON.stringify({ event: 'fallback_packet_created', sourceRunId: runId,
    sourcePacketSha256: createHash('sha256').update(inputText).digest('hex'),
    fallbackPacketSha256: createHash('sha256').update(body).digest('hex'), questions: selected.length,
    statuses: Object.fromEntries([...new Set(remaining.map((row) => row.status))].sort()
      .map((status) => [status, remaining.filter((row) => row.status === status).length])) }));
} finally { await db.end(); }
