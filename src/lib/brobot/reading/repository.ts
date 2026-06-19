import type { SupabaseClient } from '@supabase/supabase-js';

import { buildReadingSearchTerms } from './ranker';
import type { BroBotReadingEventType } from './repository-types';
import type { BroBotReadingContext, BroBotReadingResourceRow } from './types';

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
  );
}

export async function loadVerifiedReadingResources(params: {
  supabase: SupabaseClient;
  context: BroBotReadingContext;
  limit?: number;
}): Promise<BroBotReadingResourceRow[]> {
  const { supabase, context } = params;
  const tags = Array.from(
    new Set(
      [...buildReadingSearchTerms(context), context.topic, ...context.tags]
        .filter(Boolean)
        .flatMap((tag) =>
          String(tag)
            .toLowerCase()
            .split(/[:\s]+/)
            .map((part) => part.trim())
            .filter(Boolean)
        )
    )
  );

  let query = supabase
    .from('brobot_reading_resources')
    .select(
      [
        'id',
        'title',
        'resource_type',
        'source_name',
        'journal',
        'year',
        'url',
        'why_it_matters',
        'tags',
        'modes',
        'procedure_categories',
        'training_level_min',
        'training_level_max',
        'educational_yield',
        'landmark_score',
        'board_relevance',
        'clinical_relevance',
        'technique_relevance',
        'access',
        'editorial_status',
        'source_origin',
        'citation_metadata',
        'retrieval_query',
        'topic_key',
      ].join(', ')
    )
    .eq('editorial_status', 'verified')
    .limit(params.limit ?? 80);

  if (tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data as unknown as BroBotReadingResourceRow[];
}

export async function recordReadingEvents(params: {
  supabase: SupabaseClient;
  userId: string;
  conversationId: string;
  sourceMessageId: string;
  eventType: BroBotReadingEventType;
  mode?: string | null;
  trainingLevel?: string | null;
  topic?: string | null;
  resources?: Array<{
    id?: string;
    rankPosition?: number;
    rankScore?: number;
  }>;
  metadata?: Record<string, unknown>;
}) {
  const resources = params.resources?.length ? params.resources : [{}];
  const rows = resources.map((resource) => ({
    user_id: params.userId,
    conversation_id: params.conversationId,
    source_message_id: params.sourceMessageId,
    resource_id: isUuid(resource.id) ? resource.id : null,
    event_type: params.eventType,
    rank_position: resource.rankPosition ?? null,
    rank_score: resource.rankScore ?? null,
    mode: params.mode ?? null,
    training_level: params.trainingLevel ?? null,
    topic: params.topic ?? null,
    metadata: {
      ...(params.metadata ?? {}),
      resource_id: resource.id ?? null,
    },
  }));

  await params.supabase.from('brobot_reading_events').insert(rows);
}
