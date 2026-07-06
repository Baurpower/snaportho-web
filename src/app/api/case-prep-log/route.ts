import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

type CasePrepLogPayload = {
  prompt?: string;
  responseJSON?: string;
  wasHelpful?: boolean | null;
  userFeedback?: string | null;
  timestamp?: string;
};

export async function POST(request: Request) {
  let payload: CasePrepLogPayload;
  try {
    payload = (await request.json()) as CasePrepLogPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = String(payload.prompt ?? '').trim();
  const responseJSON = String(payload.responseJSON ?? '').trim();

  if (!prompt || !responseJSON) {
    return NextResponse.json({ error: 'prompt and responseJSON are required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('case_prep_logs').insert({
    prompt,
    response_json: responseJSON,
    was_helpful: payload.wasHelpful ?? null,
    user_feedback: payload.userFeedback?.trim() || null,
    source: 'web',
  });

  if (error) {
    console.error('[api/case-prep-log] insert failed', error);
    return NextResponse.json({ error: 'Failed to save case prep log' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}