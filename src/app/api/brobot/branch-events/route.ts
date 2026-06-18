import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

const BranchEventPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  sourceMessageId: z.string().uuid(),
  topicId: z.string().uuid().optional(),
  branches: z.array(
    z.object({
      id: z.string().trim().min(1).max(80).optional(),
      label: z.string().trim().min(1).max(120),
      rankPosition: z.number().int().min(1).max(20),
      mode: z.string().trim().max(40).optional(),
      trainingLevel: z.string().trim().max(40).optional(),
    })
  ).max(20),
});

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  return authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.replace(/^Bearer\s+/i, '').trim()
    : null;
}

async function getUserId(request: Request): Promise<string | null> {
  const bearerToken = getBearerToken(request);
  const supabase = bearerToken
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${bearerToken}` } },
          auth: { autoRefreshToken: false, persistSession: false },
        }
      )
    : await createServerSupabaseClient();

  const {
    data: { user },
  } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();

  return user?.id ?? null;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = BranchEventPayloadSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const userId = await getUserId(request).catch(() => null);
  if (!userId) {
    return NextResponse.json({ ok: true, skipped: 'not_authenticated' });
  }

  const payload = parsed.data;
  const supabase = createAdminClient();
  let inserted = 0;

  for (const branch of payload.branches) {
    const branchQuestionId = isUuid(branch.id) ? branch.id : null;
    const topicId = payload.topicId ?? null;

    if (!branchQuestionId && !topicId) continue;

    try {
      if (branchQuestionId) {
        const { data: existing } = await supabase
          .from('branch_events')
          .select('id')
          .eq('conversation_id', payload.conversationId)
          .eq('source_message_id', payload.sourceMessageId)
          .eq('branch_question_id', branchQuestionId)
          .eq('rank_position', branch.rankPosition)
          .eq('event_type', 'impression')
          .maybeSingle();

        if (existing) continue;
      }

      const { error } = await supabase.from('branch_events').insert({
        conversation_id: payload.conversationId,
        user_id: userId,
        topic_id: topicId,
        branch_question_id: branchQuestionId,
        event_type: 'impression',
        clicked: false,
        generated_followup: false,
        rank_position: branch.rankPosition,
        mode: branch.mode ?? null,
        training_level: branch.trainingLevel ?? null,
        branch_label: branch.label,
        source_message_id: payload.sourceMessageId,
        metadata: {
          source: 'ui_render',
        },
      });

      if (!error) inserted += 1;
    } catch (error) {
      console.error('[brobot] branch impression logging failed (non-fatal)', error);
    }
  }

  return NextResponse.json({ ok: true, inserted });
}
