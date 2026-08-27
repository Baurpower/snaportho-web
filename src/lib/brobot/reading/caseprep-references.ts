import type { SupabaseClient } from '@supabase/supabase-js';

import {
  loadReadingRecommendationCache,
  storeReadingRecommendationCache,
} from './cache';
import { getReadingRecommendations } from './recommendation-engine';
import { getHybridReadingRecommendations } from './retrieval-engine';
import {
  readingContextFromTopicContext,
  type ReadingTopicContext,
} from './topic-context';
import type {
  BroBotReadingGeneratedFrom,
  BroBotReadingRecommendation,
} from './types';
import { isTrustedReadingUrl } from './verifier';

const PAPER_TYPES = new Set([
  'pubmed_article',
  'landmark_paper',
  'review_article',
  'guideline',
  'systematic_review',
  'trial',
]);

export function sourceHintRecommendation(
  hint: { title?: string; url: string },
  topic: ReadingTopicContext,
): BroBotReadingRecommendation | null {
  if (!isTrustedReadingUrl(hint.url)) return null;
  const host = new URL(hint.url).hostname.replace(/^www\./, '');
  const sourceName = host.includes('orthobullets')
    ? 'Orthobullets'
    : host.includes('aofoundation')
      ? 'AO Surgery Reference'
      : host.includes('naileditortho')
        ? 'Nailed It Ortho Podcast'
      : host;
  return {
    id: `trusted-${Buffer.from(hint.url).toString('base64url').slice(0, 36)}`,
    title: hint.title?.trim() || `${topic.displayTopic} — ${sourceName}`,
    resourceType: host.includes('aofoundation')
      ? 'technique_article'
      : 'educational_website',
    sourceName,
    url: hint.url,
    whyItMatters: host.includes('naileditortho')
      ? 'Topic-focused orthopaedic podcast episode for audio review.'
      : host.includes('aofoundation')
      ? 'Procedure-focused operative reference from AO Foundation.'
      : 'High-yield orthopaedic topic review from a trusted educational source.',
    bestFor: host.includes('naileditortho')
      ? 'Listen during a commute or before the case'
      : host.includes('aofoundation')
      ? 'Operative steps and fixation principles'
      : 'Fast case review',
    badges: [host.includes('naileditortho')
      ? 'Podcast'
      : host.includes('aofoundation') ? 'Technique' : 'High-yield review'],
    tags: [topic.topicKey, ...topic.tags],
    access: 'free',
    sourceOrigin: 'curated',
    rankScore: 0.94,
    rankPosition: 1,
    isTechniqueRelevant: host.includes('aofoundation'),
  };
}

function dedupe(resources: BroBotReadingRecommendation[]) {
  const byUrl = new Map<string, BroBotReadingRecommendation>();
  for (const resource of resources) {
    const key = resource.url.replace(/\/$/, '').toLowerCase();
    const existing = byUrl.get(key);
    if (!existing || resource.rankScore > existing.rankScore)
      byUrl.set(key, resource);
  }
  return Array.from(byUrl.values());
}

export function selectBalancedCasePrepReferences(
  resources: BroBotReadingRecommendation[],
  max = 6,
) {
  const sorted = dedupe(resources).sort((a, b) => b.rankScore - a.rankScore);
  const podcasts = sorted.filter((resource) => resource.sourceName === 'Nailed It Ortho Podcast');
  const educational = sorted.filter(
    (resource) => !PAPER_TYPES.has(resource.resourceType) && resource.sourceName !== 'Nailed It Ortho Podcast',
  );
  const reviews = sorted.filter((resource) =>
    ['guideline', 'systematic_review', 'review_article'].includes(
      resource.resourceType,
    ),
  );
  const landmark = sorted.filter(
    (resource) =>
      PAPER_TYPES.has(resource.resourceType) &&
      (resource.isLandmark || (resource.citationCount ?? 0) >= 100),
  );
  const papers = sorted.filter((resource) =>
    PAPER_TYPES.has(resource.resourceType),
  );
  const selected: BroBotReadingRecommendation[] = [];
  const take = (items: BroBotReadingRecommendation[], count: number) => {
    for (const item of items) {
      if (
        selected.length >= max ||
        count <= 0 ||
        selected.some((value) => value.url === item.url)
      )
        continue;
      selected.push(item);
      count -= 1;
    }
  };

  take(educational, 2);
  take(podcasts, 1);
  take(reviews, 2);
  take(landmark, 1);
  take(papers, max - selected.length);
  take(sorted, max - selected.length);

  return selected.slice(0, max).map((resource, index) => ({
    ...resource,
    rankPosition: index + 1,
  }));
}

export function casePrepSourcesPayload(resources: BroBotReadingRecommendation[]) {
  const sources = resources.filter((resource) => isTrustedReadingUrl(resource.url)).map((resource) => ({
    source_id: resource.id,
    title: resource.title,
    publisher: resource.sourceName,
    url: resource.url,
    resource_type:
      resource.sourceName === 'Nailed It Ortho Podcast'
        ? 'podcast'
        : resource.resourceType,
    recommended_for: resource.bestFor ?? resource.whyItMatters,
    badges: resource.badges ?? [],
    journal: resource.journal ?? null,
    year: resource.year ?? null,
  }));
  return {
    status: sources.length >= 3 ? 'complete' : sources.length ? 'limited' : 'unavailable',
    reason: sources.length ? null : 'No strong case-specific resources were found yet.',
    sources,
  };
}

export async function getCasePrepReferences(params: {
  supabase: SupabaseClient;
  topic: ReadingTopicContext;
  sourceHints?: Array<{ title?: string; url: string }>;
  max?: number;
}) {
  const max = params.max ?? 6;
  const cached = await loadReadingRecommendationCache({
    supabase: params.supabase,
    topic: params.topic,
  });
  if (cached) {
    const hinted = (params.sourceHints ?? [])
      .map((hint) => sourceHintRecommendation(hint, params.topic))
      .filter((resource): resource is BroBotReadingRecommendation => Boolean(resource));
    return {
      recommendationSetId: cached.recommendationSetId,
      generatedFrom: cached.generatedFrom,
      topic: params.topic.displayTopic,
      // Packet-owned procedure and approach links must not disappear merely
      // because a general topic recommendation set was already cached.
      resources: selectBalancedCasePrepReferences(
        [...hinted, ...cached.resources],
        max,
      ),
    };
  }

  const [curated, live] = await Promise.all([
    getReadingRecommendations({
      supabase: params.supabase,
      context: readingContextFromTopicContext(params.topic),
      max: 20,
    }).catch(() => []),
    getHybridReadingRecommendations({
      supabase: params.supabase,
      topic: params.topic,
      max: 12,
    }).catch(() => null),
  ]);
  const hinted = (params.sourceHints ?? [])
    .map((hint) => sourceHintRecommendation(hint, params.topic))
    .filter((resource): resource is BroBotReadingRecommendation =>
      Boolean(resource),
    );
  const resources = selectBalancedCasePrepReferences(
    [...hinted, ...curated, ...(live?.resources ?? [])],
    max,
  );
  const generatedFrom: BroBotReadingGeneratedFrom =
    curated.length > 0 || hinted.length > 0
      ? live?.resources.length
        ? 'hybrid'
        : 'curated'
      : 'live';
  const recommendationSetId =
    (await storeReadingRecommendationCache({
      supabase: params.supabase,
      topic: params.topic,
      generatedFrom,
      retrievalQuery: live?.retrievalQuery ?? params.topic.primaryQuery,
      resources,
    })) ??
    live?.recommendationSetId ??
    crypto.randomUUID();

  return {
    recommendationSetId,
    generatedFrom,
    topic: params.topic.displayTopic,
    resources,
  };
}
