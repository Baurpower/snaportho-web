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
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import {
  runObProduction,
  type ObRunnerDb,
  type ObRunnerPacket,
} from '../src/lib/brobot/orthobullets/ob-production-runner-lib';
import type { ObAliasHit, ObRegistryQuestionRow } from '../src/lib/brobot/orthobullets/ob-question-identity';
import type { ObResolutionCandidateRow } from '../src/lib/brobot/orthobullets/ob-claim-resolution';

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
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const strong = env.BROBOT_STRONG_MODEL?.trim() || 'gpt-4o';
  const models = {
    generator: env.BROBOT_OB_CLAIMS_GENERATOR_MODEL?.trim() || strong,
    reviewer: env.BROBOT_OB_CLAIMS_CRITIC_MODEL?.trim() || strong,
    coverage: env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong,
    repair: env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong,
    validator: strong,
    resolution: strong,
  };

  const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
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
  const query = async <T>(text: string, params: unknown[] = []): Promise<T[]> => {
    try {
      const result = await client.query(text, params as never[]);
      return result.rows as T[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/timeout|expired|ECONNRESET|ENOTFOUND|connection/i.test(message)) {
        throw new Error(`db_timeout: ${message.slice(0, 200)}`);
      }
      throw error;
    }
  };

  // pg parses timestamptz into Date; the resolution lib contracts ISO strings.
  type ResolutionDbRow = Omit<ObResolutionCandidateRow, 'createdAt'> & { createdAt: string | Date };
  const normalizeResolutionRow = (row: ResolutionDbRow): ObResolutionCandidateRow => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  });

  const db: ObRunnerDb = {
    getRun: async (id) => {
      const rows = await query<{ id: string; status: string }>(
        'select id, status from public.ob_claim_production_runs where id = $1', [id],
      );
      return rows[0] ?? null;
    },
    createRun: async (input) => {
      const rows = await query<{ id: string }>(
        `insert into public.ob_claim_production_runs (run_key, config, expected_count, created_by)
         values ($1, $2, $3, $4) returning id`,
        [input.runKey, JSON.stringify(input.config), input.expectedCount, input.createdBy],
      );
      return { id: rows[0].id };
    },
    upsertItems: async (id, rows) => {
      if (!rows.length) return 0;
      const values: unknown[] = [];
      const tuples = rows.map((row, index) => {
        const base = index * 3;
        values.push(id, row.nativeQuestionId, row.specialty);
        return `($${base + 1}, $${base + 2}, $${base + 3})`;
      });
      await query(
        `insert into public.ob_claim_production_items (run_id, native_question_id, specialty)
         values ${tuples.join(', ')} on conflict (run_id, native_question_id) do nothing`,
        values,
      );
      return rows.length;
    },
    leaseItem: async (id, workerId, leaseSeconds) => {
      const rows = await query<{
        item_id: string; native_question_id: string; specialty: string | null;
        attempt_count: number; max_attempts: number; source_fingerprint_hash: string | null; exhausted: boolean;
      }>('select * from public.ob_claim_lease_item($1, $2, $3)', [id, workerId, leaseSeconds]);
      const row = rows[0];
      return row ? {
        itemId: row.item_id, nativeQuestionId: row.native_question_id, specialty: row.specialty,
        attemptCount: Number(row.attempt_count), maxAttempts: Number(row.max_attempts),
        sourceFingerprintHash: row.source_fingerprint_hash, exhausted: row.exhausted,
      } : null;
    },
    heartbeat: async (itemId, workerId, leaseSeconds) => {
      const rows = await query<{ ob_claim_heartbeat: string }>(
        'select public.ob_claim_heartbeat($1, $2, $3) as ob_claim_heartbeat', [itemId, workerId, leaseSeconds],
      );
      const status = rows[0]?.ob_claim_heartbeat;
      if (status !== 'ok' && status !== 'lease_lost' && status !== 'item_missing') throw new Error(`bad heartbeat: ${status}`);
      return status;
    },
    setItemStatus: async (itemId, status) => {
      await query(
        `update public.ob_claim_production_items set status = $2, updated_at = now() where id = $1`,
        [itemId, status],
      );
    },
    completeItem: async (input) => {
      await query('select public.ob_claim_complete_item($1, $2, $3, $4, $5, $6, $7, $8)', [
        input.itemId, input.workerId, input.status, input.diagnostic, input.reasonCodes,
        JSON.stringify({
          prompt_tokens: input.usage.promptTokens,
          completion_tokens: input.usage.completionTokens,
          estimated_cost_usd: input.usage.estimatedCostUsd,
        }), input.nextAttemptAt,
        input.identity ? JSON.stringify({
          outcome: input.identity.outcome, registry_question_id: input.identity.registryQuestionId,
          method: input.identity.method, confidence: input.identity.confidence,
          evidence: input.identity.evidence, locator: input.identity.locator,
          conflicting_ids: input.identity.conflictingIds,
        }) : null,
      ]);
    },
    persistExtraction: async (itemId, workerId, payload) => {
      const rows = await query<{ ob_claim_persist_extraction: Record<string, unknown> }>(
        'select public.ob_claim_persist_extraction($1, $2, $3) as ob_claim_persist_extraction',
        [itemId, workerId, JSON.stringify(payload)],
      );
      return rows[0].ob_claim_persist_extraction;
    },
    adoptLiveEvent: async (itemId, workerId, attemptId) => {
      await query('select public.ob_claim_adopt_live_event($1, $2, $3)', [itemId, workerId, attemptId]);
    },
    findRegistryByNative: async (nativeQuestionId) => {
      return query<ObRegistryQuestionRow>(
        `select q.id as "id", s.slug as "sourceSlug", q.external_question_id as "externalQuestionId",
          q.topic_slug as "topicSlug", q.topic_normalized as "topicNormalized",
          q.specialty_normalized as "specialtyNormalized", q.is_active as "isActive"
         from public.external_questions q
         join public.external_sources s on s.id = q.source_id
         where q.external_question_id = $1`,
        [nativeQuestionId],
      );
    },
    findRegistryByAliases: async (aliasValues) => {
      if (!aliasValues.length) return [];
      return query<{ aliasKind: string; aliasValue: string; row: ObAliasHit['row'] }>(
        `select a.alias_kind as "aliasKind", a.alias_value as "aliasValue",
          jsonb_build_object(
            'id', q.id, 'sourceSlug', s.slug, 'externalQuestionId', q.external_question_id,
            'topicSlug', q.topic_slug, 'topicNormalized', q.topic_normalized,
            'specialtyNormalized', q.specialty_normalized, 'isActive', q.is_active
          ) as "row"
         from public.source_aliases a
         join public.external_questions q on q.id = a.entity_id
         join public.external_sources s on s.id = q.source_id
         where a.entity_type = 'external_question' and a.is_active and a.alias_value = any($1)`,
        [aliasValues],
      ).then((rows) => rows.map((row) => ({
        aliasKind: row.aliasKind, aliasValue: row.aliasValue, row: row.row,
      })));
    },
    countExtractionAttempts: async (nativeQuestionId, sourceHash) => {
      const rows = await query<{ count: string }>(
        `select count(*) as count from public.ob_claim_extraction_events
         where provider = 'orthobullets' and native_question_id = $1
           and source_fingerprint_hash = $2 and algorithm_version = 'orthobullets-claims-prod.v1'
           and prompt_set_version = 'ob-claims-prod-prompts-v1.0'`,
        [nativeQuestionId, sourceHash],
      );
      return Number(rows[0].count);
    },
    findLiveAcceptedAttempt: async (nativeQuestionId, sourceHash) => {
      const rows = await query<{ id: string }>(
        `select id from public.ob_claim_extraction_events
         where provider = 'orthobullets' and native_question_id = $1
           and source_fingerprint_hash = $2 and algorithm_version = 'orthobullets-claims-prod.v1'
           and prompt_set_version = 'ob-claims-prod-prompts-v1.0'
           and superseded_by_attempt_id is null and final_state = 'accepted'
         limit 1`,
        [nativeQuestionId, sourceHash],
      );
      return rows[0] ? { attemptId: rows[0].id } : null;
    },
    findLiveAttemptAny: async (nativeQuestionId, sourceHash) => {
      const rows = await query<{ id: string }>(
        `select id from public.ob_claim_extraction_events
         where provider = 'orthobullets' and native_question_id = $1
           and source_fingerprint_hash = $2 and algorithm_version = 'orthobullets-claims-prod.v1'
           and prompt_set_version = 'ob-claims-prod-prompts-v1.0'
           and superseded_by_attempt_id is null
         limit 1`,
        [nativeQuestionId, sourceHash],
      );
      return rows[0] ? { attemptId: rows[0].id } : null;
    },
    findByExactIdentity: async (structuralHash, semanticHash) => {
      return query<ResolutionDbRow>(
        `select c.id as "id", c.claim_text as "claimText", c.claim_type as "claimType",
          c.qualifiers as "qualifiers", c.fingerprint_hash as "fingerprintHash",
          c.semantic_fingerprint_hash as "semanticFingerprintHash",
          c.is_active as "isActive", c.created_at as "createdAt", c.algorithm_version as "algorithmVersion"
         from public.educational_claims c
         where c.is_active and c.fingerprint_hash = $1 and c.semantic_fingerprint_hash = $2
         order by c.created_at asc, c.id asc`,
        [structuralHash, semanticHash],
      ).then((rows) => rows.map(normalizeResolutionRow));
    },
    findBySemanticHash: async (semanticHash) => {
      return query<ResolutionDbRow>(
        `select c.id as "id", c.claim_text as "claimText", c.claim_type as "claimType",
          c.qualifiers as "qualifiers", c.fingerprint_hash as "fingerprintHash",
          c.semantic_fingerprint_hash as "semanticFingerprintHash",
          c.is_active as "isActive", c.created_at as "createdAt", c.algorithm_version as "algorithmVersion"
         from public.educational_claims c
         where c.is_active and c.semantic_fingerprint_hash = $1
         order by c.created_at asc, c.id asc limit 10`,
        [semanticHash],
      ).then((rows) => rows.map(normalizeResolutionRow));
    },
    findTextNeighbors: async (normalizedText, limit) => {
      return query<ResolutionDbRow>(
        `select c.id as "id", c.claim_text as "claimText", c.claim_type as "claimType",
          c.qualifiers as "qualifiers", c.fingerprint_hash as "fingerprintHash",
          c.semantic_fingerprint_hash as "semanticFingerprintHash",
          c.is_active as "isActive", c.created_at as "createdAt", c.algorithm_version as "algorithmVersion"
         from public.educational_claims c
         where c.is_active and extensions.similarity(c.claim_text, $1) >= 0.35
         order by extensions.similarity(c.claim_text, $1) desc, c.created_at asc
         limit $2`,
        [normalizedText, Math.max(1, Math.min(20, limit))],
      ).then((rows) => rows.map(normalizeResolutionRow));
    },
  };

  const openai = new OpenAI({ apiKey });
  const workerId = args.get('--worker-id') ?? `worker-${process.pid}-${Math.floor(Math.random() * 1e6)}`;
  let processed = 0;

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
      },
      specialtyFilter: args.get('--specialty') ?? null,
      questionFilter: args.get('--question-id') ?? null,
      models,
      costPer1kPromptUsd: Number(env.BROBOT_COST_PROMPT_PER_1K_USD ?? '0.0025'),
      costPer1kCompletionUsd: Number(env.BROBOT_COST_COMPLETION_PER_1K_USD ?? '0.01'),
      backoffBaseSeconds: 30,
      backoffCapSeconds: 1800,
      heartbeatDivider: 3,
      requestTimeoutMs: Number(args.get('--request-timeout-ms') ?? '120000'),
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
  const finalReport = { ...report, databaseTotals };
  writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(finalReport, null, 2)}\n`);
  console.log(JSON.stringify({ event: 'finished', outDir, ...finalReport, items: undefined }));
  await client.end();
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
  process.exit(1);
});
