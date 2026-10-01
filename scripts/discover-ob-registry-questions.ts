/**
 * Registry discovery for Orthobullets questions (v5 canary prerequisite).
 *
 * The v5 identity resolver matches packets against public.external_questions
 * (exact native/alias only) and never creates registry rows. Packets fetched
 * from topic pages carry topic qids that are usually undiscovered, so a
 * find-or-create discovery pass must run BEFORE the production runner.
 *
 * This mirrors the established v4 convention exactly (same table, same
 * conflict target, same metadata vocabulary):
 *   upsert (source_id, external_question_id) with discovery='review_page'.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
 *     scripts/discover-ob-registry-questions.ts --input=packets.json \
 *     (--dry-run | --apply) [--max-questions=N] [--out=dir]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { safeOrthobulletsTopicId } from '../src/lib/brobot/orthobullets/question-identity.ts';

export type ObDiscoveryPacket = {
  nativeQuestionId: string;
  specialty?: string;
  topicUrl?: string | null;
  topic?: string | null;
};

export type ObRegistryRowMapping = {
  externalQuestionId: string;
  topicRaw: string | null;
  topicNormalized: string | null;
  topicId: string | null;
};

export type ObRegistryExistingRow = {
  id: string;
  isActive: boolean;
  topicRaw: string | null;
  topicNormalized: string | null;
  topicId: string | null;
};

export type ObRegistryDiscoveryOutcome = 'created' | 'reactivated' | 'updated' | 'unchanged';

export function classifyRegistryUpsert(
  existing: ObRegistryExistingRow | null,
  incoming: ObRegistryRowMapping,
): ObRegistryDiscoveryOutcome {
  if (!existing) return 'created';
  if (!existing.isActive) return 'reactivated';
  const fillsMissing = (
    (!existing.topicRaw && !!incoming.topicRaw)
    || (!existing.topicNormalized && !!incoming.topicNormalized)
    || (!existing.topicId && !!incoming.topicId)
  );
  return fillsMissing ? 'updated' : 'unchanged';
}

/** Pure packet → registry-row mapping (v4 field semantics). */
export function mapPacketToRegistryRow(packet: ObDiscoveryPacket): ObRegistryRowMapping {
  const topicRaw = (packet.topic ?? '').trim().slice(0, 300) || null;
  const topicId = extractTopicId(packet.topicUrl);
  return {
    externalQuestionId: packet.nativeQuestionId,
    topicRaw,
    topicNormalized: topicRaw?.toLowerCase() ?? null,
    topicId,
  };
}

/** Numeric topic segment from .../<specialty>/<topicId>/<slug> URLs, else null. */
export function extractTopicId(topicUrl: string | null | undefined): string | null {
  if (!topicUrl) return null;
  const match = /\/(\d{1,12})\/[^/?#]*\/?(?:[?#]|$)/.exec(topicUrl);
  return safeOrthobulletsTopicId(match?.[1] ?? null);
}

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
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
    const at = clean.indexOf('=');
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.get('--input');
  if (!inputPath) throw new Error('missing --input=packets.json');
  const apply = args.get('--apply') === 'true';
  const dryRun = args.get('--dry-run') === 'true';
  if (apply && dryRun) throw new Error('choose exactly one of --apply or --dry-run');
  if (!apply && !dryRun) throw new Error('refusing registry writes without --apply (or pass --dry-run)');
  const maxQuestions = Number(args.get('--max-questions') ?? '0');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = args.get('--out') ?? path.join('tmp', 'ob-registry-discovery', stamp);
  mkdirSync(outDir, { recursive: true });

  const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
  if (!Array.isArray(raw)) throw new Error('packet file must be a JSON array');
  let packets = raw as ObDiscoveryPacket[];
  if (maxQuestions > 0) packets = packets.slice(0, maxQuestions);

  const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const source = await client.query(
      `select id from public.external_sources where slug = 'orthobullets'`,
    );
    if (!source.rows[0]) throw new Error('orthobullets source row missing');
    const sourceId = source.rows[0].id as string;

    const counts: Record<ObRegistryDiscoveryOutcome, number> = {
      created: 0, reactivated: 0, updated: 0, unchanged: 0,
    };
    const lines: string[] = [];
    const seenQids = new Set<string>();
    for (const packet of packets) {
      const mapping = mapPacketToRegistryRow(packet);
      if (!/^\d{1,12}$/.test(mapping.externalQuestionId)) {
        throw new Error(`invalid native question id: ${mapping.externalQuestionId}`);
      }
      if (seenQids.has(mapping.externalQuestionId)) {
        throw new Error(`duplicate native question id: ${mapping.externalQuestionId}`);
      }
      seenQids.add(mapping.externalQuestionId);
      const found = await client.query<{
        id: string; is_active: boolean; topic_raw: string | null;
        topic_normalized: string | null; topic_id: string | null;
      }>(
        `select id, is_active, topic_raw, topic_normalized,
                metadata ->> 'topicId' as topic_id
           from public.external_questions
          where source_id = $1 and external_question_id = $2`,
        [sourceId, mapping.externalQuestionId],
      );
      const existingRow = found.rows[0] ? {
        id: found.rows[0].id,
        isActive: found.rows[0].is_active,
        topicRaw: found.rows[0].topic_raw,
        topicNormalized: found.rows[0].topic_normalized,
        topicId: found.rows[0].topic_id,
      } : null;
      const outcome = classifyRegistryUpsert(existingRow, mapping);
      if (!apply) {
        lines.push(JSON.stringify({ qid: mapping.externalQuestionId, outcome: `would_${outcome}` }));
        counts[outcome] += 1;
        continue;
      }
      const result = await client.query<{ id: string }>(
        `insert into public.external_questions
           (source_id, external_question_id, topic_raw, topic_normalized, metadata, last_seen_at, is_active)
         values ($1, $2, $3, $4,
           jsonb_strip_nulls(jsonb_build_object('discovery', 'review_page', 'pageKind', 'review', 'topicId', $5::text)),
           now(), true)
         on conflict (source_id, external_question_id) do update set
           topic_raw = coalesce(public.external_questions.topic_raw, excluded.topic_raw),
           topic_normalized = coalesce(public.external_questions.topic_normalized, excluded.topic_normalized),
           metadata = excluded.metadata || coalesce(public.external_questions.metadata, '{}'::jsonb),
           last_seen_at = now(),
           is_active = true
         returning id`,
        [sourceId, mapping.externalQuestionId, mapping.topicRaw, mapping.topicNormalized, mapping.topicId],
      );
      counts[outcome] += 1;
      lines.push(JSON.stringify({ qid: mapping.externalQuestionId, outcome, id: result.rows[0].id }));
    }
    writeFileSync(path.join(outDir, 'discovery.jsonl'), `${lines.join('\n')}\n`);
    console.log(JSON.stringify({ event: 'finished', apply, processed: packets.length, ...counts, outDir }));
  } finally {
    await client.end();
  }
}

const invoked = process.argv[1]?.endsWith('discover-ob-registry-questions.ts') ?? false;
if (invoked) {
  main().catch((error) => {
    console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
    if (error instanceof Error && error.stack) console.error(error.stack.split('\n').slice(0, 6).join('\n'));
    process.exit(1);
  });
}
