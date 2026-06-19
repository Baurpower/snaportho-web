import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeReadingTopic } from './ranker';
import type { ReadingTopicContext } from './topic-context';
import type { BroBotReadingGeneratedFrom, BroBotReadingRecommendation } from './types';

const PUBMED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cacheKey(topic: ReadingTopicContext) {
  return `${topic.topicKey}:${topic.mode}:${topic.trainingLevel}`;
}

function containsTopicTerm(value: string, term: string) {
  return normalizeReadingTopic(value).includes(normalizeReadingTopic(term));
}

function hasExcludedTopicTerm(resource: BroBotReadingRecommendation, topic: ReadingTopicContext) {
  const haystack = [
    resource.title,
    resource.whyItMatters,
    ...(resource.tags ?? []),
  ].join(' ');
  const excludedTerms = topic.excludedTerms.length ? topic.excludedTerms : topic.exclusions;
  return excludedTerms.some((term) => containsTopicTerm(haystack, term));
}

export async function loadReadingRecommendationCache(params: {
  supabase: SupabaseClient;
  topic: ReadingTopicContext;
}): Promise<{
  recommendationSetId: string;
  generatedFrom: BroBotReadingGeneratedFrom;
  resources: BroBotReadingRecommendation[];
} | null> {
  try {
    const { data, error } = await params.supabase
      .from('brobot_reading_recommendation_cache')
      .select('id, generated_from, resources, verified_at')
      .eq('cache_key', cacheKey(params.topic))
      .gt('verified_at', new Date(Date.now() - PUBMED_TTL_MS).toISOString())
      .order('verified_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !Array.isArray(data.resources)) return null;
    const resources = (data.resources as BroBotReadingRecommendation[]).filter((resource) => {
      if (params.topic.comparisonRequested) return true;
      return !hasExcludedTopicTerm(resource, params.topic);
    });
    if (resources.length === 0) return null;

    return {
      recommendationSetId: String(data.id),
      generatedFrom: 'cached',
      resources,
    };
  } catch {
    return null;
  }
}

export async function storeReadingRecommendationCache(params: {
  supabase: SupabaseClient;
  topic: ReadingTopicContext;
  generatedFrom: BroBotReadingGeneratedFrom;
  retrievalQuery: string;
  resources: BroBotReadingRecommendation[];
}) {
  if (params.resources.length === 0) return null;

  try {
    const { data, error } = await params.supabase
      .from('brobot_reading_recommendation_cache')
      .upsert(
        {
          cache_key: cacheKey(params.topic),
          topic_key: params.topic.topicKey,
          display_topic: params.topic.displayTopic,
          mode: params.topic.mode,
          training_level: params.topic.trainingLevel,
          source_origin: params.generatedFrom === 'live' ? 'pubmed_live' : params.generatedFrom,
          generated_from: params.generatedFrom,
          retrieval_query: params.retrievalQuery,
          resources: params.resources,
          verified_at: new Date().toISOString(),
        },
        { onConflict: 'cache_key' }
      )
      .select('id')
      .single();

    if (error || !data) return null;
    return String(data.id);
  } catch {
    return null;
  }
}
