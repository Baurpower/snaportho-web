/**
 * v5 production runner (contract ob-claims-production.v1). Noninteractive.
 *
 *   npm run ob:claims:run -- --input <transient-packets> --apply [...]
 *   npm run ob:claims:resume -- --run-id <id> --input <transient-packets> --apply [...]
 *
 * --apply is required for durable semantic writes; without it the runner
 * performs a zero-write dry run. Never links Anki cards. Never creates
 * canonical entities. Never runs the full corpus without explicit canary
 * authorization (see runbook); use --max-questions for canaries.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import {
  runObProduction,
  type ObRunnerPacket,
} from '../src/lib/brobot/orthobullets/ob-production-runner-lib';
import { createPgObRunnerDb, createPgQuery } from '../src/lib/brobot/orthobullets/ob-pg-store';
import { resolveObModelProfile } from './lib/ob-model-profile';

const require = createRequire(import.meta.url);
const { Client } = require('pg') as typeof import('pg');

function parseArgs(values: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith('--')) continue;
    const at = value.indexOf('=');
    args.set(at < 0 ? value : value.slice(0, at), at < 0 ? 'true' : value.slice(at + 1));
  }
  return args;
}

function loadEnv(file: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
    const at = clean.indexOf('=');
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function validPacket(row: unknown): row is ObRunnerPacket {
  if (!row || typeof row !== 'object') return false;
  const candidate = row as Record<string, unknown>;
  const packet = candidate.packet as Record<string, unknown> | undefined;
  if (typeof candidate.nativeQuestionId !== 'string' || !packet) return false;
  if (typeof packet.stem !== 'string' || !packet.stem.trim()) return false;
  if (!Array.isArray(packet.answerChoices) || packet.answerChoices.length < 2) return false;
  return true;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.get('--mode') === 'resume' ? 'resume' : 'run';
  const inputPath = args.get('--input');
  if (!inputPath) throw new Error('missing --input=<transient-packet-file>');
  const apply = args.get('--apply') === 'true';
  const dryRun = args.get('--dry-run') === 'true';
  if (apply && dryRun) throw new Error('choose exactly one of --apply or --dry-run');
  if (!apply && !dryRun) throw new Error('refusing durable run without --apply (or pass --dry-run)');
  const runId = args.get('--run-id') ?? null;
  if (mode === 'resume' && !runId) throw new Error('resume mode requires --run-id');
  if (mode === 'resume' && !apply) throw new Error('resume mode requires --apply (dry run uses run mode)');

  const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured');
  const modelProfile = args.get('--model-profile') ?? 'environment';
  const provider = resolveObModelProfile(modelProfile, env);
  const models = provider.models;

  const rawText = readFileSync(inputPath, 'utf8');
  const packetSha256 = createHash('sha256').update(rawText).digest('hex');
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const releaseSha = (args.get('--release-sha') ?? headSha).trim();
  if (releaseSha !== headSha) throw new Error('--release-sha must equal the checked-out HEAD');
  if (apply) {
    const releasePaths = [
      'scripts/run-ob-claims-production.ts',
      'scripts/lib/ob-model-profile.ts',
      'src/lib/brobot/orthobullets/ob-production-runner-lib.ts',
      'src/lib/brobot/orthobullets/claim-review-pipeline.ts',
      'src/lib/brobot/orthobullets/claim-extraction-contract-v1.ts',
      'src/lib/brobot/orthobullets/ob-claim-resolution.ts',
      'src/lib/brobot/orthobullets/ob-question-identity.ts',
    ];
    try {
      execFileSync('git', ['diff', '--quiet', 'HEAD', '--', ...releasePaths]);
    } catch {
      throw new Error('refusing durable run: pipeline source differs from the recorded release SHA');
    }
  }
  const raw = JSON.parse(rawText) as unknown;
  if (!Array.isArray(raw)) throw new Error('packet file must be a JSON array');
  const invalid = raw.findIndex((row) => !validPacket(row));
  if (invalid >= 0) throw new Error(`invalid packet at index ${invalid}`);
  const packets = raw as ObRunnerPacket[];

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = args.get('--out') ?? path.join('tmp', 'ob-claims-production', stamp);
  mkdirSync(outDir, { recursive: true });
  const checkpointPath = path.join(outDir, 'checkpoints.jsonl');

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const query = createPgQuery(client);
  const db = createPgObRunnerDb(query);

  const openai = new OpenAI({ apiKey: provider.apiKey, ...(provider.baseURL ? { baseURL: provider.baseURL } : {}) });
  const workerId = args.get('--worker-id') ?? `worker-${process.pid}-${Math.floor(Math.random() * 1e6)}`;
  let processed = 0;

  if (mode === 'resume' && runId) {
    await query('select public.ob_claim_recover_expired_leases($1)', [runId]);
    await query('select public.ob_claim_resume_run($1)', [runId]);
  }
  const promptPrice = provider.promptPricePer1kUsd;
  const completionPrice = provider.completionPricePer1kUsd;
  const pricingProfile = {
    version: args.get('--pricing-profile') ?? provider.pricingVersion,
    model_profile: modelProfile, provider: provider.provider, base_url: provider.baseURL,
    prompt_per_1k_usd: promptPrice, completion_per_1k_usd: completionPrice,
  };
  const report = await runObProduction(
    {
      db,
      model: openai as never,
      packets,
      now: () => new Date().toISOString(),
      nowMs: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      random: () => Math.random(),
      onCheckpoint: (entry) => {
        processed += 1;
        appendFileSync(checkpointPath, `${JSON.stringify(entry)}\n`);
        console.log(JSON.stringify({ checkpoint: processed, ...entry }));
      },
    },
    {
      mode,
      runId,
      apply,
      workerId,
      leaseSeconds: Number(args.get('--lease-seconds') ?? '300'),
      forceReprocess: args.get('--force-reprocess') === 'true',
      limits: {
        maxQuestions: Number(args.get('--max-questions') ?? '0'),
        maxErrors: Number(args.get('--max-errors') ?? '0'),
        maxCostUsd: Number(args.get('--max-cost') ?? '0'),
        maxConsecutiveFailures: Number(args.get('--max-consecutive-failures') ?? '10'),
        maxItemCostUsd: Number(args.get('--max-item-cost') ?? '0'),
      },
      specialtyFilter: args.get('--specialty') ?? null,
      questionFilter: args.get('--question-id') ?? null,
      models,
      costPer1kPromptUsd: promptPrice,
      costPer1kCompletionUsd: completionPrice,
      backoffBaseSeconds: 30,
      backoffCapSeconds: 1800,
      heartbeatDivider: 3,
      requestTimeoutMs: Number(args.get('--request-timeout-ms') ?? '120000'),
      releaseSha,
      packetSha256,
      pricingProfile,
      interItemDelayMs: Number(args.get('--inter-item-delay-ms') ?? '0'),
    },
  );
  const databaseTotals = report.runId ? (await query<{
    status: string; count: string; prompt_tokens: string; completion_tokens: string; estimated_cost_usd: string;
  }>(
    `select status, count(*)::text as count,
            coalesce(sum(prompt_tokens), 0)::text as prompt_tokens,
            coalesce(sum(completion_tokens), 0)::text as completion_tokens,
            coalesce(sum(estimated_cost_usd), 0)::text as estimated_cost_usd
       from public.ob_claim_production_items where run_id = $1 group by status order by status`,
    [report.runId],
  )) : [];
  let lifecycle: Record<string, unknown> | null = null;
  if (apply && report.runId) {
    if (report.stoppedBy === 'queue_empty') {
      const rows = await query<{ result: Record<string, unknown> }>(
        'select public.ob_claim_finalize_run($1) as result', [report.runId],
      );
      lifecycle = rows[0]?.result ?? null;
      if (lifecycle?.terminal !== true) {
        await query('select public.ob_claim_pause_run($1, $2)', [report.runId, 'deferred_nonterminal_work']);
      }
    } else {
      await query('select public.ob_claim_pause_run($1, $2)', [report.runId, report.stoppedBy ?? 'worker_stopped']);
      lifecycle = { terminal: false, status: 'paused', reason: report.stoppedBy };
    }
  }
  const finalReport = { ...report, releaseSha, packetSha256, pricingProfile, lifecycle, databaseTotals };
  writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(finalReport, null, 2)}\n`);
  console.log(JSON.stringify({ event: 'finished', outDir, ...finalReport, items: undefined }));
  await client.end();
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
  process.exit(1);
});
