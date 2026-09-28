// Deno entry point for the send-anki-feedback-emails Edge Function.
//
// Invoked every 15 minutes by Supabase Cron (service-role JWT). Each run:
//   1. claims due rows via claim_anki_feedback_batch() (atomic, SKIP LOCKED)
//   2. sends one email per claimed row through Resend
//   3. records success/failure back to public.anki_feedback_emails
//
// Manual use:
//   POST with {}            -> run one batch
//   POST with {"dry_run":true} (or ?dry_run=true) -> preview eligible rows
//   GET                     -> usage info, sends nothing

import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  DEFAULT_BATCH_LIMIT,
  DEFAULT_FROM_EMAIL,
  DEFAULT_REPLY_TO,
  normalizeBatchLimit,
  parseUserIdsFilter,
  runFeedbackBatch,
} from './logic.ts';
import type { ClaimedRow, DbClient } from './logic.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readOptions(request: Request): Promise<{
  batchLimit: number;
  dryRun: boolean;
  userIds: string[] | null;
}> {
  const url = new URL(request.url);
  let body: Record<string, unknown> = {};
  if (request.method === 'POST') {
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }
  const dryRun =
    url.searchParams.get('dry_run') === 'true' ||
    url.searchParams.get('dryRun') === 'true' ||
    body['dry_run'] === true ||
    body['dryRun'] === true;
  const batchLimit = normalizeBatchLimit(
    url.searchParams.get('batch_limit') ??
      url.searchParams.get('batchLimit') ??
      body['batch_limit'] ??
      body['batchLimit'] ??
      DEFAULT_BATCH_LIMIT,
  );
  // Optional manual-test scope. Absent/empty = all due users (cron default).
  const userIds = parseUserIdsFilter(
    body['user_ids'] ?? body['userIds'] ?? url.searchParams.get('user_ids'),
  );
  return { batchLimit, dryRun, userIds };
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      function: 'send-anki-feedback-emails',
      usage:
        'POST {} to run a batch; POST {"dry_run":true} to preview eligible rows; ' +
        'add {"user_ids":["<uuid>",...]} to scope a manual run to specific users.',
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use GET or POST.' }, 405);
  }

  const startedAt = Date.now();
  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = requiredEnv('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FEEDBACK_FROM_EMAIL')?.trim() || DEFAULT_FROM_EMAIL;
    const replyTo = Deno.env.get('FEEDBACK_REPLY_TO')?.trim() || DEFAULT_REPLY_TO;

    let options: { batchLimit: number; dryRun: boolean; userIds: string[] | null };
    try {
      options = await readOptions(request);
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Invalid options' },
        400,
      );
    }
    const { batchLimit, dryRun, userIds } = options;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const db: DbClient = {
      async claimBatch(limit, isDryRun, ids): Promise<ClaimedRow[]> {
        const { data, error } = await supabase.rpc('claim_anki_feedback_batch', {
          batch_limit: limit,
          dry_run: isDryRun,
          p_user_ids: ids,
        });
        if (error) throw new Error(`Claim failed: ${error.message}`);
        return (data ?? []) as ClaimedRow[];
      },
      async markSent(id, resendId): Promise<void> {
        const { error } = await supabase
          .from('anki_feedback_emails')
          .update({
            status: 'sent',
            resend_email_id: resendId,
            sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw new Error(`markSent failed: ${error.message}`);
      },
      async markFailed(id, errorMessage, resendId = null): Promise<void> {
        const { error } = await supabase
          .from('anki_feedback_emails')
          .update({
            status: 'failed',
            last_error: errorMessage,
            ...(resendId ? { resend_email_id: resendId } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw new Error(`markFailed failed: ${error.message}`);
      },
    };

    const stats = await runFeedbackBatch({
      db,
      batchLimit,
      dryRun,
      userIds,
      sendEmail: async ({ to, subject, html, text, idempotencyKey }) => {
        const response = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject,
            html,
            text,
            reply_to: replyTo,
            tags: [{ name: 'kind', value: 'anki_beta_feedback_24h' }],
          }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          id?: string;
          message?: string;
        };
        if (!response.ok || !body.id) {
          throw new Error(body.message ?? `Resend failed with ${response.status}`);
        }
        return { id: body.id };
      },
      log: (message, detail) => console.log(`[send-anki-feedback-emails] ${message}`, detail ?? {}),
    });

    return jsonResponse({ ...stats, durationMs: Date.now() - startedAt });
  } catch (error) {
    // Top-level failures only (claim/secret/config). Per-row failures are
    // recorded on their rows and reported in stats, never thrown.
    console.error(
      '[send-anki-feedback-emails] batch failed',
      error instanceof Error ? error.message : error,
    );
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Batch failed' },
      500,
    );
  }
});
