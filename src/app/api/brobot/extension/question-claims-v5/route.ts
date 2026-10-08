import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { NextResponse } from 'next/server';

import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import {
  BROBOT_OB_CLAIMS_CRITIC_MODEL,
  BROBOT_OB_CLAIMS_GENERATOR_MODEL,
  BROBOT_OB_CLAIMS_REVIEW_MODEL,
  BROBOT_STRONG_MODEL,
} from '@/lib/brobot/model-config';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { OB_PROD_ALGORITHM } from '@/lib/brobot/orthobullets/claim-extraction-contract-v1';
import { createPgQuery } from '@/lib/brobot/orthobullets/ob-pg-store';
import {
  processTransientOrthobulletsQuestion,
  transientPacketFromPageContext,
  type DurableTransientResult,
} from '@/lib/brobot/orthobullets/transient-claim-processor';
import { runTransientProductionSingle } from '@/lib/brobot/orthobullets/transient-production-runner';
import { OrthobulletsQuestionClaimV5RequestSchema } from '@/lib/brobot/orthobullets/types';
import { createAdminClient } from '@/lib/supabase/admin';

const require = createRequire(import.meta.url);
const { Client } = require('pg') as typeof import('pg');

const TOKEN_HEADER = 'x-snaportho-extension-token';
const ALGORITHM = OB_PROD_ALGORITHM;
const MAX_AUTOMATIC_ATTEMPTS = 5;
type Admin = ReturnType<typeof createAdminClient>;

async function authorizedCurator(admin: Admin, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email?.toLowerCase() === 'alexbaur123@gmail.com';
}

async function ensureRunItem(admin: Admin, input: { userId: string; nativeQuestionId: string; reviewLocator: string; runId?: string; runItemId?: string }) {
  if (input.runId && input.runItemId) {
    const { data } = await admin.from('orthobullets_claim_run_items').select('id,run_id,attempt_count')
      .eq('id', input.runItemId).eq('run_id', input.runId).eq('user_id', input.userId).maybeSingle();
    if (!data) throw new Error('claim_run_item_not_found');
    if (Number(data.attempt_count ?? 0) >= MAX_AUTOMATIC_ATTEMPTS) throw new Error('automatic_retry_limit_exhausted');
    await admin.from('orthobullets_claim_run_items').update({
      status: 'processing', processing_stage: 'extracted', started_at: new Date().toISOString(),
      lease_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      attempt_count: Number(data.attempt_count ?? 0) + 1,
    }).eq('id', data.id);
    return { runId: data.run_id, itemId: data.id };
  }
  const testKey = `single:${input.nativeQuestionId}`;
  const { data: run, error: runError } = await admin.from('orthobullets_claim_runs').upsert({
    user_id: input.userId, test_key: testKey, status: 'running', expected_count: 1,
    algorithm_version: ALGORITHM, completed_at: null,
  }, { onConflict: 'user_id,test_key,algorithm_version' }).select('id').single();
  if (runError || !run) throw new Error('claim_run_create_failed');
  const { data: item, error: itemError } = await admin.from('orthobullets_claim_run_items').upsert({
    run_id: run.id, user_id: input.userId, native_question_id: input.nativeQuestionId,
    review_locator: input.reviewLocator.slice(0, 1000), status: 'processing', algorithm_version: ALGORITHM,
    started_at: new Date().toISOString(),
  }, { onConflict: 'run_id,native_question_id' }).select('id,attempt_count').single();
  if (itemError || !item) throw new Error('claim_run_item_create_failed');
  if (Number(item.attempt_count ?? 0) >= MAX_AUTOMATIC_ATTEMPTS) throw new Error('automatic_retry_limit_exhausted');
  await admin.from('orthobullets_claim_run_items').update({
    processing_stage: 'extracted', lease_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    attempt_count: Number(item.attempt_count ?? 0) + 1,
  }).eq('id', item.id);
  return { runId: run.id, itemId: item.id };
}

function clampClaimPage(value: unknown) {
  if (!value || typeof value !== 'object') return value;
  const body = value as { pageContext?: Record<string, unknown> };
  const page = body.pageContext;
  if (!page) return value;
  if (typeof page.title === 'string') page.title = page.title.slice(0, 300);
  if (Array.isArray(page.breadcrumbs)) {
    page.breadcrumbs = page.breadcrumbs
      .map((item) => typeof item === 'string' ? item.trim().slice(0, 200) : '')
      .filter((item) => item.length > 0);
  }
  return value;
}

export async function POST(request: Request) {
  const auth = await authenticateDeviceLinkedRequest(request, { deviceTokenHeader: TOKEN_HEADER, allowBrowserSession: false, allowBearerToken: false });
  if ('response' in auth) return auth.response;
  const parsed = OrthobulletsQuestionClaimV5RequestSchema.safeParse(clampClaimPage(await request.json().catch(() => null)));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const admin = createAdminClient();
  if (!await authorizedCurator(admin, auth.userId)) return NextResponse.json({ error: 'curator_authorization_required' }, { status: 403 });
  const page = parsed.data.pageContext;
  const nativeQuestionId = page.questionId!;
  const locator = new URL(page.sourceUrl || page.pageUrl); locator.hash = '';

  let run: { runId: string; itemId: string };
  try {
    run = await ensureRunItem(admin, {
      userId: auth.userId, nativeQuestionId, reviewLocator: locator.toString(),
      runId: parsed.data.runId, runItemId: parsed.data.runItemId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'automatic_retry_limit_exhausted') {
      return NextResponse.json({ status: 'unresolved_claim', reason: error.message }, { status: 202 });
    }
    return NextResponse.json({ error: 'claim_run_item_unavailable' }, { status: 500 });
  }

  const { data: source } = await admin.from('external_sources').select('id').eq('slug', 'orthobullets').maybeSingle();
  if (!source) {
    return NextResponse.json({ status: 'unresolved_source', reason: 'orthobullets_source_missing' }, { status: 202 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: 'database_unavailable' }, { status: 500 });
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // The transient packet exists only for this request: it is built in memory
    // from the ready review page and released by the processor afterwards.
    const packet = transientPacketFromPageContext(page);
    const query = createPgQuery(client);
    const { durable } = await processTransientOrthobulletsQuestion(
      { nativeQuestionId, reviewLocator: locator.toString(), packet },
      {
        db: {
          findCompletedExtraction: async (qid, sourceHash) => {
            const rows = await query<{ id: string }>(
              `select id from public.ob_claim_extraction_events
               where provider = 'orthobullets' and native_question_id = $1
                 and source_fingerprint_hash = $2 and algorithm_version = $3
                 and prompt_set_version = 'ob-claims-prod-prompts-v1.0'
                 and superseded_by_attempt_id is null and final_state = 'accepted'
               limit 1`,
              [qid, sourceHash, ALGORITHM],
            );
            return rows[0] ? { attemptId: rows[0].id } : null;
          },
          runProductionSingle: (input) => runTransientProductionSingle(input, {
            query,
            model: getOpenAI() as never,
            models: {
              generator: BROBOT_OB_CLAIMS_GENERATOR_MODEL,
              reviewer: BROBOT_OB_CLAIMS_CRITIC_MODEL,
              coverage: BROBOT_OB_CLAIMS_REVIEW_MODEL,
              repair: BROBOT_OB_CLAIMS_REVIEW_MODEL,
              validator: BROBOT_STRONG_MODEL,
              resolution: BROBOT_STRONG_MODEL,
            },
            promptPer1kUsd: Number(process.env.BROBOT_COST_PROMPT_PER_1K_USD ?? '0.0025'),
            completionPer1kUsd: Number(process.env.BROBOT_COST_COMPLETION_PER_1K_USD ?? '0.01'),
            workerId: `transient-${randomUUID().slice(0, 8)}`,
          }),
        },
      },
    );
    await checkpointRunItem(admin, run.itemId, run.runId, durable);
    return NextResponse.json({
      status: durable.status,
      sourceHash: durable.sourceHash,
      claimCount: durable.claims.filter((claim) => claim.accepted).length,
      claims: durable.claims.filter((claim) => claim.accepted).map((claim) => ({
        id: claim.id, text: claim.text, claimType: claim.claimType, importance: claim.importance,
      })),
      diagnostics: durable.diagnostics,
      completedAttemptId: durable.completedAttemptId,
      runItemId: run.itemId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'transient_processing_failed';
    await admin.from('orthobullets_claim_run_items').update({
      status: 'retryable', last_error_code: 'v5_transient_failed', retry_class: 'transient',
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(), lease_expires_at: null,
      reason_codes: ['v5_transient_failed'], updated_at: new Date().toISOString(),
    }).eq('id', run.itemId);
    await admin.rpc('refresh_orthobullets_claim_run', { p_run_id: run.runId });
    return NextResponse.json({ status: 'retryable', reason: message.slice(0, 120), runItemId: run.itemId }, { status: 202 });
  } finally {
    await client.end().catch(() => {});
  }
}

async function checkpointRunItem(admin: Admin, itemId: string, runId: string, durable: DurableTransientResult) {
  // Durable-only progress checkpoint: hashes, diagnostics, model usage, and
  // reason codes. Claims, links, and extraction artifacts live in the v5
  // production tables via the shared persist path.
  const accepted = durable.claims.filter((claim) => claim.accepted).length;
  const status =
    durable.status === 'accepted' || durable.status === 'skipped_completed' ? 'accepted_no_card'
    : durable.status === 'identity_unresolved' || durable.status === 'identity_conflict' ? 'unresolved_source'
    : durable.status === 'failed_transient' ? 'retryable'
    : 'unresolved_claim';
  const reasonCodes =
    durable.status === 'accepted' ? ['v5_transient_accepted', `claims_accepted_${accepted}`]
    : durable.status === 'skipped_completed' ? ['unchanged_source_cache_hit']
    : durable.status === 'failed_transient' ? ['v5_transient_failed', ...durable.diagnostics.slice(0, 3)]
    : ['v5_transient_unresolved', ...durable.diagnostics.slice(0, 4)];
  await admin.from('orthobullets_claim_run_items').update({
    status,
    source_fingerprint_hash: durable.sourceHash,
    processing_stage: status === 'retryable' ? 'extracted' : 'complete',
    prompt_token_count: durable.usageTotals.promptTokens,
    completion_token_count: durable.usageTotals.completionTokens,
    reason_codes: reasonCodes,
    last_error_code: status === 'accepted_no_card' ? null : durable.diagnostics[0] ?? 'ai_review_unresolved',
    card_outcome: status === 'accepted_no_card' ? 'no_card' : null,
    next_attempt_at: status === 'retryable' ? new Date(Date.now() + 60_000).toISOString() : null,
    lease_expires_at: null,
    completed_at: status === 'retryable' ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', itemId);
  await admin.rpc('refresh_orthobullets_claim_run', { p_run_id: runId });
}
