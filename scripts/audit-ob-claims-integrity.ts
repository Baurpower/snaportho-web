/** Read-only, fail-closed integrity suite for one Orthobullets production run. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function argsOf(values: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith('--')) continue;
    const at = value.indexOf('=');
    args.set(at < 0 ? value : value.slice(0, at), at < 0 ? 'true' : value.slice(at + 1));
  }
  return args;
}

function loadEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) return [];
    const at = clean.indexOf('=');
    return [[clean.slice(0, at).trim(), clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')]];
  }));
}

export const OB_INTEGRITY_CHECKS = [
  {
    name: 'duplicate_live_events',
    sql: `select count(*)::int as violations from (
      select provider, native_question_id, source_fingerprint_hash, algorithm_version, prompt_set_version
      from public.ob_claim_extraction_events where superseded_by_attempt_id is null
      group by 1,2,3,4,5 having count(*) > 1
    ) x`,
  },
  {
    name: 'duplicate_active_links',
    sql: `select count(*)::int as violations from (
      select provider, native_question_id, claim_id from public.question_claim_links
      where is_active and algorithm_version = 'orthobullets-claims-prod.v1'
      group by 1,2,3 having count(*) > 1
    ) x`,
  },
  {
    name: 'invalid_active_links',
    sql: `select count(*)::int as violations from public.question_claim_links l
      left join public.educational_claims c on c.id = l.claim_id
      left join public.educational_claim_versions v on v.id = l.claim_version_id and v.claim_id = l.claim_id
      where l.is_active and l.algorithm_version = 'orthobullets-claims-prod.v1'
        and (c.id is null or not c.is_active or v.id is null or nullif(l.evidence_locator, '') is null)`,
  },
  {
    name: 'item_event_pointer_mismatch',
    sql: `select count(*)::int as violations from public.ob_claim_production_items i
      join public.ob_claim_extraction_events e on e.id = i.live_attempt_id
      where i.run_id = $1 and (
        e.native_question_id <> i.native_question_id
        or e.source_fingerprint_hash is distinct from i.source_fingerprint_hash
        or e.provider <> 'orthobullets'
        or e.algorithm_version <> 'orthobullets-claims-prod.v1'
      )`,
  },
  {
    name: 'accepted_incomplete_coverage',
    sql: `select count(*)::int as violations from public.ob_claim_extraction_events e
      join public.ob_claim_production_items i on i.live_attempt_id = e.id
      where i.run_id = $1 and i.status in ('accepted', 'adopted')
        and (e.final_state <> 'accepted' or e.coverage_verdict <> 'complete')`,
  },
  {
    name: 'invalid_v5_claim_surface',
    sql: `select count(*)::int as violations from public.question_claim_links l
      join public.educational_claims c on c.id = l.claim_id
      where l.is_active and l.algorithm_version = 'orthobullets-claims-prod.v1'
        and c.algorithm_version = 'orthobullets-claims-prod.v1'
        and (c.predicate <> 'v5_assertion' or c.primary_entity_id is not null or c.review_status <> 'unreviewed'
             or l.review_status <> 'needs_review')`,
  },
  {
    name: 'terminal_contract_or_check_failures',
    sql: `select count(*)::int as violations from public.ob_claim_production_items
      where run_id = $1 and status = 'failed_permanent'
        and (last_diagnostic in ('safety_violation', 'persistence_failed')
             or reason_codes && array['contract_rejected', 'persist_rejected'])`,
  },
] as const;

async function main(): Promise<void> {
  const args = argsOf(process.argv.slice(2));
  const runId = args.get('--run-id');
  if (!runId) throw new Error('missing --run-id=UUID');
  const outDir = args.get('--out') ?? path.join('tmp', 'ob-claims-integrity', runId);
  mkdirSync(outDir, { recursive: true });
  const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    const run = await db.query(
      `select id, status, expected_count, completed_count, accepted_count, unresolved_count, failed_count,
              total_prompt_tokens, total_completion_tokens, total_estimated_cost_usd
         from public.ob_claim_production_runs where id = $1`,
      [runId],
    );
    if (run.rows.length !== 1) throw new Error(`run not found: ${runId}`);
    const statuses = await db.query(
      `select status, count(*)::int as count from public.ob_claim_production_items
        where run_id = $1 group by status order by status`,
      [runId],
    );
    const checks = [];
    for (const check of OB_INTEGRITY_CHECKS) {
      const result = await db.query(check.sql, check.sql.includes('$1') ? [runId] : []);
      const violations = Number(result.rows[0]?.violations ?? 0);
      checks.push({ name: check.name, violations, pass: violations === 0 });
    }
    const report = {
      runId, generatedAt: new Date().toISOString(), pass: checks.every((check) => check.pass),
      run: run.rows[0], statuses: statuses.rows, checks,
    };
    writeFileSync(path.join(outDir, 'integrity-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ event: 'finished', outDir, pass: report.pass, checks }));
    if (!report.pass) process.exitCode = 2;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
  process.exit(1);
});
