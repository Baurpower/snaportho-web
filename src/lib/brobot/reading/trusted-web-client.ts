import type { ReadingTopicContext } from './topic-context';
import type { BroBotReadingRecommendation } from './types';
import { isTrustedReadingUrl, verifyTrustedWebResult } from './verifier';

export type TrustedWebSearchResult = Pick<
  BroBotReadingRecommendation,
  'id' | 'title' | 'resourceType' | 'sourceName' | 'url' | 'whyItMatters' | 'tags'
>;

export async function retrieveTrustedWebResults(params: {
  topic: ReadingTopicContext;
}): Promise<TrustedWebSearchResult[]> {
  void params;
  // No trusted search provider is configured in this app yet. Keep the interface
  // explicit and return no results rather than scraping arbitrary web pages.
  return [];
}

export function filterVerifiedTrustedWebResults(
  results: TrustedWebSearchResult[],
  topic: ReadingTopicContext
): TrustedWebSearchResult[] {
  return results.filter(
    (result) => isTrustedReadingUrl(result.url) && verifyTrustedWebResult({
      ...result,
      journal: undefined,
      year: undefined,
      access: 'free',
      rankScore: 0,
      rankPosition: 1,
    }, topic)
  );
}
