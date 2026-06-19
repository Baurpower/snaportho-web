import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { recordReadingEvents } from '@/lib/brobot/reading';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

const ReadingEventRequestSchema = z.object({
  conversationId: z.string().uuid(),
  sourceMessageId: z.string().uuid(),
  resourceId: z.string().trim().min(1).max(120),
  eventType: z.enum(['click', 'feedback_helpful', 'feedback_not_helpful']).default('click'),
  rankPosition: z.number().int().min(1).max(20).optional(),
  rankScore: z.number().optional(),
  mode: z.string().trim().max(40).optional(),
  trainingLevel: z.string().trim().max(40).optional(),
  topic: z.string().trim().max(180).optional(),
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

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = ReadingEventRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const userId = await getUserId(request).catch(() => null);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const payload = parsed.data;

  const { data: message } = await supabase
    .from('brobot_messages')
    .select('id')
    .eq('id', payload.sourceMessageId)
    .eq('conversation_id', payload.conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!message) {
    return NextResponse.json({ ok: false, error: 'message_not_found' }, { status: 404 });
  }

  await recordReadingEvents({
    supabase,
    userId,
    conversationId: payload.conversationId,
    sourceMessageId: payload.sourceMessageId,
    eventType: payload.eventType,
    mode: payload.mode ?? null,
    trainingLevel: payload.trainingLevel ?? null,
    topic: payload.topic ?? null,
    resources: [
      {
        id: payload.resourceId,
        rankPosition: payload.rankPosition,
        rankScore: payload.rankScore,
      },
    ],
    metadata: { source: 'read_next_card' },
  }).catch((error) => {
    console.error('[brobot] reading event failed', error);
  });

  return NextResponse.json({ ok: true });
}
