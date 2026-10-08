/**
 * Shared pg-backed ObRunnerDb for the v5 production pipeline.
 *
 * Used by the file-driven production script and by the transient
 * (browser/extension-driven) single-question flow. Both callers share one
 * persistence implementation, so transient runs get identical guarantees:
 * leases, identity, resolution, atomic persist, and completion.
 */
import type { ObAliasHit, ObRegistryQuestionRow } from './ob-question-identity';
import type { ObResolutionCandidateRow } from './ob-claim-resolution';
import type { ObRunnerDb } from './ob-production-runner-lib';

export type PgQueryFn = <T>(text: string, params?: unknown[]) => Promise<T[]>;

type PgClientLike = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

export function createPgQuery(client: PgClientLike): PgQueryFn {
  return async <T>(text: string, params: unknown[] = []): Promise<T[]> => {
    try {
      const result = await client.query(text, params);
      return result.rows as T[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/timeout|expired|ECONNRESET|ENOTFOUND|connection/i.test(message)) {
        throw new Error(`db_timeout: ${message.slice(0, 200)}`);
      }
      throw error;
    }
  };
}

export function createPgObRunnerDb(query: PgQueryFn): ObRunnerDb {
  // pg parses timestamptz into Date; the resolution lib contracts ISO strings.
  type ResolutionDbRow = Omit<ObResolutionCandidateRow, 'createdAt'> & { createdAt: string | Date };
  const normalizeResolutionRow = (row: ResolutionDbRow): ObResolutionCandidateRow => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  });

  return {
    getRun: async (id) => {
      const rows = await query<{ id: string; status: string; releaseSha: string | null; packetSha256: string | null; executionManifest: Record<string, unknown> | null }>(
        `select id, status, release_sha as "releaseSha", packet_sha256 as "packetSha256",
                execution_manifest as "executionManifest"
           from public.ob_claim_production_runs where id = $1`, [id],
      );
      return rows[0] ?? null;
    },
    createRun: async (input) => {
      const rows = await query<{ id: string }>(
        `insert into public.ob_claim_production_runs
          (run_key, config, expected_count, created_by, release_sha, packet_sha256,
           execution_manifest, pricing_profile, manifest_locked_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now()) returning id`,
        [input.runKey, JSON.stringify(input.config), input.expectedCount, input.createdBy,
          input.releaseSha, input.packetSha256, JSON.stringify(input.executionManifest), JSON.stringify(input.pricingProfile)],
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
}
