import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import { ORTHOBULLETS_AUTONOMOUS_CLAIM_VERSION } from '@/lib/brobot/orthobullets/autonomous-claim';
import { createAdminClient } from '@/lib/supabase/admin';

const TOKEN_HEADER = 'x-snaportho-extension-token';
const StartRunSchema = z.object({
  testKey: z.string().trim().min(1).max(300),
  questions: z.array(z.object({
    nativeQuestionId: z.string().regex(/^[A-Za-z0-9._:-]{1,200}$/),
    reviewLocator: z.string().url().max(1000),
  })).min(1).max(500),
});

export async function POST(request: Request) {
  const auth = await authenticateDeviceLinkedRequest(request, {
    deviceTokenHeader: TOKEN_HEADER, allowBrowserSession: false, allowBearerToken: false,
  });
  if ('response' in auth) return auth.response;
  const parsed = StartRunSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const admin = createAdminClient();
  const { data: reviewer } = await admin.auth.admin.getUserById(auth.userId);
  if (reviewer.user?.email?.toLowerCase() !== 'alexbaur123@gmail.com') {
    return NextResponse.json({ error: 'curator_authorization_required' }, { status: 403 });
  }
  const unique = [...new Map(parsed.data.questions.map((question) => [question.nativeQuestionId, question])).values()];
  if (unique.some((question) => {
    const url = new URL(question.reviewLocator);
    return !/(^|\.)orthobullets\.com$/i.test(url.hostname) || url.protocol !== 'https:';
  })) return NextResponse.json({ error: 'invalid_review_locator' }, { status: 400 });

  const { data: run, error: runError } = await admin.from('orthobullets_claim_runs').upsert({
    user_id: auth.userId, test_key: parsed.data.testKey, status: 'running', expected_count: unique.length,
    algorithm_version: ORTHOBULLETS_AUTONOMOUS_CLAIM_VERSION, completed_at: null,
  }, { onConflict: 'user_id,test_key,algorithm_version' }).select('id').single();
  if (runError || !run) return NextResponse.json({ error: 'claim_run_create_failed' }, { status: 500 });
  const { error: itemError } = await admin.from('orthobullets_claim_run_items').upsert(unique.map((question) => ({
    run_id: run.id, user_id: auth.userId, native_question_id: question.nativeQuestionId,
    review_locator: question.reviewLocator, status: 'pending',
    algorithm_version: ORTHOBULLETS_AUTONOMOUS_CLAIM_VERSION,
  })), { onConflict: 'run_id,native_question_id', ignoreDuplicates: true });
  if (itemError) return NextResponse.json({ error: 'claim_run_items_create_failed' }, { status: 500 });
  const { data: items, error: readError } = await admin.from('orthobullets_claim_run_items')
    .select('id,native_question_id,status,claim_id,linked_card_count,last_error_code')
    .eq('run_id', run.id).order('native_question_id');
  if (readError) return NextResponse.json({ error: 'claim_run_items_read_failed' }, { status: 500 });
  await admin.rpc('refresh_orthobullets_claim_run', { p_run_id: run.id });
  return NextResponse.json({ runId: run.id, algorithmVersion: ORTHOBULLETS_AUTONOMOUS_CLAIM_VERSION, items });
}
