import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { BROBOT_PERSONAL_STATEMENT_MODEL } from '@/lib/brobot/model-config';
import { getBroBotAccessGate } from '@/lib/brobot/brobot-entitlement-access';
import { createGuestSession, getGuestSessionFromRequest } from '@/lib/brobot/guest-session';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildReviewPrompt, hashStatement, normalizeStatementText, parseAndVerifyReview, validateStatementLength } from '@/lib/brobot/personal-statement/contract';
import { PERSONAL_STATEMENT_JSON_SCHEMA } from '@/lib/brobot/personal-statement/model-schema';
import { PERSONAL_STATEMENT_PROMPT_VERSION, PERSONAL_STATEMENT_SCHEMA_VERSION } from '@/lib/brobot/personal-statement/types';
import type { Subject } from '@/lib/brobot/entitlements';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ReviewStage = 'request_validation' | 'identity_resolution' | 'duplicate_lookup' | 'entitlement_check' | 'model_generation' | 'model_validation' | 'persistence' | 'usage_recording' | 'response_serialization';
type ReviewErrorCode = 'invalid_request' | 'auth_resolution_failed' | 'entitlement_resolution_failed' | 'quota_exceeded' | 'provider_failed' | 'invalid_model_response' | 'persistence_failed' | 'usage_recording_failed' | 'internal_error';

class ReviewRouteError extends Error {
  constructor(public code: ReviewErrorCode, public stage: ReviewStage, message: string, public status: number) { super(message); }
}

const RequestSchema = z.object({
  text: z.string(),
  sourceType: z.enum(['paste', 'docx', 'pdf', 'txt']).default('paste'),
  originalFilename: z.string().max(120).nullable().optional(),
});

function responseError(code: string, message: string, status: number, requestId: string, stage: ReviewStage) {
  return NextResponse.json({ error: code, message, requestId, ...(process.env.NODE_ENV !== 'production' ? { stage } : {}) }, { status });
}

function safePersistenceCode(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  return error.code || 'database_error';
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let stage: ReviewStage = 'request_validation';
  let subject: Subject | null = null;
  let guestCookie: string | null = null;
  try {
    const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return responseError('invalid_request', 'Provide a personal statement to review.', 400, requestId, stage);
    const statementText = normalizeStatementText(parsed.data.text);
    const length = validateStatementLength(statementText);
    if (!length.ok) return responseError(length.code, length.message, 400, requestId, stage);

    stage = 'identity_resolution';
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const sessionMissing = authError?.name === 'AuthSessionMissingError' || authError?.message.toLowerCase().includes('auth session missing');
    if (authError && !sessionMissing) throw new ReviewRouteError('auth_resolution_failed', stage, 'Your session could not be verified. Sign in again.', 401);
    if (user) subject = { type: 'user', id: user.id };
    else {
      const existingGuest = getGuestSessionFromRequest(request);
      if (existingGuest) subject = { type: 'guest', id: existingGuest.guestId };
      else {
        const created = createGuestSession();
        subject = { type: 'guest', id: created.session.guestId };
        guestCookie = created.cookie;
      }
    }

    const statementHash = hashStatement(statementText);
    let persistenceWarning: 'persistence_failed' | null = null;
    stage = 'duplicate_lookup';
    if (user) {
      const { data: existing, error: lookupError } = await createAdminClient().from('personal_statement_reviews')
        .select('id,review_json,model,prompt_version,review_schema_version,created_at')
        .eq('user_id', user.id).eq('statement_hash', statementHash).eq('status', 'completed')
        .eq('review_schema_version', PERSONAL_STATEMENT_SCHEMA_VERSION)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (lookupError) {
        persistenceWarning = 'persistence_failed';
        console.error('[personal-statement-review] duplicate lookup unavailable', { requestId, stage, code: safePersistenceCode(lookupError) });
      } else if (existing) {
        return NextResponse.json({
          id: existing.id, review: parseAndVerifyReview(existing.review_json, statementText), statementHash,
          model: existing.model, promptVersion: existing.prompt_version,
          reviewSchemaVersion: existing.review_schema_version, createdAt: existing.created_at,
          remainingFreeUses: null, cached: true, saved: true, requestId,
        });
      }
    }

    stage = 'entitlement_check';
    let gate: Awaited<ReturnType<typeof getBroBotAccessGate>>;
    try { gate = await getBroBotAccessGate(subject); }
    catch { throw new ReviewRouteError('entitlement_resolution_failed', stage, 'BroBot access could not be checked. Please try again.', 503); }
    if (gate.isLimitReached) {
      await recordUsageEvent({ subject, outcome: 'limit_hit' });
      return responseError('quota_exceeded', 'You’ve used today’s BroBot reviews.', 429, requestId, stage);
    }

    const model = BROBOT_PERSONAL_STATEMENT_MODEL;
    stage = 'model_generation';
    let completion;
    try {
      completion = await getOpenAI().chat.completions.create({
        model,
        messages: [{ role: 'user', content: buildReviewPrompt(statementText) }],
        response_format: PERSONAL_STATEMENT_JSON_SCHEMA,
        temperature: 0.2,
      });
    } catch { throw new ReviewRouteError('provider_failed', stage, 'We couldn’t reach the review provider. Your allowance was not used.', 502); }

    stage = 'model_validation';
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new ReviewRouteError('invalid_model_response', stage, 'BroBot returned an incomplete review. Your allowance was not used.', 502);
    let raw: unknown;
    try { raw = JSON.parse(content); }
    catch { throw new ReviewRouteError('invalid_model_response', stage, 'BroBot returned an incomplete review. Your allowance was not used.', 502); }
    let review;
    try { review = parseAndVerifyReview(raw, statementText); }
    catch (error) {
      console.error('[personal-statement-review] model validation failed', { requestId, stage, issuePaths: error instanceof z.ZodError ? error.issues.map((issue) => issue.path.join('.')).slice(0, 20) : [] });
      throw new ReviewRouteError('invalid_model_response', stage, 'BroBot returned an incomplete review. Your allowance was not used.', 502);
    }

    let id: string | null = null;
    stage = 'persistence';
    if (user) {
      const { data, error } = await createAdminClient().from('personal_statement_reviews').insert({
        user_id: user.id, status: 'completed', source_type: parsed.data.sourceType,
        original_filename: parsed.data.originalFilename?.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120) ?? null,
        statement_text: statementText, statement_hash: statementHash, word_count: length.wordCount,
        model, prompt_version: PERSONAL_STATEMENT_PROMPT_VERSION,
        review_schema_version: PERSONAL_STATEMENT_SCHEMA_VERSION, review_json: review,
        completed_at: new Date().toISOString(),
      }).select('id').single();
      if (error) {
        persistenceWarning = 'persistence_failed';
        console.error('[personal-statement-review] persistence unavailable', { requestId, stage, code: safePersistenceCode(error) });
      } else id = data.id;
    }

    stage = 'usage_recording';
    let used: number;
    try { used = await recordSuccessfulAIUse(subject, Date.now() - startedAt); }
    catch { throw new ReviewRouteError('usage_recording_failed', stage, 'The review could not be finalized. Your allowance was not used.', 503); }

    stage = 'response_serialization';
    const res = NextResponse.json({
      id, review, statementHash, model, promptVersion: PERSONAL_STATEMENT_PROMPT_VERSION,
      reviewSchemaVersion: PERSONAL_STATEMENT_SCHEMA_VERSION, createdAt: new Date().toISOString(),
      remainingFreeUses: gate.dailyCap == null ? null : Math.max(0, gate.dailyCap - used),
      saved: user ? !persistenceWarning : false, persistenceWarning, requestId,
    });
    if (guestCookie) res.headers.append('Set-Cookie', guestCookie);
    return res;
  } catch (error) {
    if (subject) await recordUsageEvent({ subject, outcome: 'failure', latencyMs: Date.now() - startedAt });
    const routeError = error instanceof ReviewRouteError ? error : new ReviewRouteError('internal_error', stage, 'We couldn’t complete the review. Your allowance was not used.', 500);
    console.error('[personal-statement-review] request failed', { requestId, stage: routeError.stage, code: routeError.code, authMode: subject?.type || 'unresolved', hasIdentity: Boolean(subject) });
    return responseError(routeError.code, routeError.message, routeError.status, requestId, routeError.stage);
  }
}
