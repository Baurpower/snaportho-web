import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  extractReadingTopicContext,
  getHybridReadingRecommendations,
  recordReadingEvents,
} from '@/lib/brobot/reading';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

const ReadingRecommendationsRequestSchema = z.object({
  conversationId: z.string().uuid(),
  sourceMessageId: z.string().uuid(),
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

async function inferTrainingLevel(params: {
  supabase: ReturnType<typeof createAdminClient>;
  conversationId: string;
  sourceMessageId: string;
}) {
  const { data } = await params.supabase
    .from('branch_events')
    .select('training_level')
    .eq('conversation_id', params.conversationId)
    .eq('source_message_id', params.sourceMessageId)
    .not('training_level', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return typeof data?.training_level === 'string' ? data.training_level : 'pgy2';
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = ReadingRecommendationsRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const userId = await getUserId(request).catch(() => null);
  if (!userId) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { conversationId, sourceMessageId } = parsed.data;
  const supabase = createAdminClient();

  const { data: message, error } = await supabase
    .from('brobot_messages')
    .select('id, conversation_id, user_id, role, structured_json, mode, created_at')
    .eq('id', sourceMessageId)
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }

  if (!message || message.role !== 'assistant') {
    return NextResponse.json({ error: 'message_not_found' }, { status: 404 });
  }

  const trainingLevel = await inferTrainingLevel({
    supabase,
    conversationId,
    sourceMessageId,
  });
  const { data: latestUserMessage } = await supabase
    .from('brobot_messages')
    .select('content')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .eq('role', 'user')
    .lt('created_at', message.created_at)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const topicContext = extractReadingTopicContext({
    structuredJson: message.structured_json,
    latestUserMessage:
      typeof latestUserMessage?.content === 'string' ? latestUserMessage.content : null,
    fallbackMode: typeof message.mode === 'string' ? message.mode : 'general',
    fallbackTrainingLevel: trainingLevel,
  });
  const recommendationResult = await getHybridReadingRecommendations({
    supabase,
    topic: topicContext,
    max: 5,
  });
  const resources = recommendationResult.resources;

  await recordReadingEvents({
    supabase,
    userId,
    conversationId,
    sourceMessageId,
    eventType: 'panel_open',
    mode: topicContext.mode,
    trainingLevel: topicContext.trainingLevel,
    topic: topicContext.displayTopic,
    metadata: {
      resource_count: resources.length,
      recommendation_set_id: recommendationResult.recommendationSetId,
      generated_from: recommendationResult.generatedFrom,
    },
  }).catch((eventError) => {
    console.error('[brobot] reading panel event failed (non-fatal)', eventError);
  });

  if (resources.length > 0) {
    await recordReadingEvents({
      supabase,
      userId,
      conversationId,
      sourceMessageId,
      eventType: 'impression',
      mode: topicContext.mode,
      trainingLevel: topicContext.trainingLevel,
      topic: topicContext.displayTopic,
      resources: resources.map((resource) => ({
        id: resource.id,
        rankPosition: resource.rankPosition,
        rankScore: resource.rankScore,
      })),
      metadata: {
        source: 'read_next_panel',
        recommendation_set_id: recommendationResult.recommendationSetId,
        generated_from: recommendationResult.generatedFrom,
      },
    }).catch((eventError) => {
      console.error('[brobot] reading impression event failed (non-fatal)', eventError);
    });
  }

  return NextResponse.json({
    recommendationSetId: recommendationResult.recommendationSetId,
    topic: recommendationResult.topic,
    generatedFrom: recommendationResult.generatedFrom,
    resources: resources.map((resource) => {
      const { rankScore, ...resourceForClient } = resource;
      void rankScore;
      return resourceForClient;
    }),
  });
}
