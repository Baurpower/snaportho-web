import type { PubMedArticle } from './pubmed-client';

type FetchLike = typeof fetch;
type CitationCacheLike = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<unknown>;
    };
  };
};

export type CitationLookupResource = Pick<PubMedArticle, 'doi' | 'pmid'>;

function openAlexWorkUrl(resource: CitationLookupResource) {
  if (resource.doi) {
    return `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(resource.doi)}`;
  }
  if (resource.pmid) {
    return `https://api.openalex.org/works?filter=ids.pmid:${encodeURIComponent(resource.pmid)}&per-page=1`;
  }
  return null;
}

function resourceKey(resource: CitationLookupResource) {
  return resource.doi ? `doi:${resource.doi.toLowerCase()}` : `pmid:${resource.pmid}`;
}

async function cacheCitationCount(
  supabase: CitationCacheLike | undefined,
  resource: CitationLookupResource,
  count: number
) {
  if (!supabase) return;
  const payload = {
    citation_count: count,
    citation_source: 'OpenAlex',
    citation_checked_at: new Date().toISOString(),
  };

  try {
    if (resource.doi) {
      await supabase.from('brobot_reading_resources').update(payload).eq('doi', resource.doi);
    } else if (resource.pmid) {
      await supabase.from('brobot_reading_resources').update(payload).eq('pmid', resource.pmid);
    }
  } catch {
    // Citation caching is opportunistic; lookup results are still usable.
  }
}

export async function getCitationCounts(params: {
  resources: CitationLookupResource[];
  fetchImpl?: FetchLike;
  supabase?: CitationCacheLike;
}): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const fetchImpl = params.fetchImpl ?? fetch;

  await Promise.all(
    params.resources.map(async (resource) => {
      const url = openAlexWorkUrl(resource);
      if (!url) return;

      try {
        const response = await fetchImpl(url);
        if (!response.ok) return;
        const json = await response.json();
        const work = Array.isArray(json?.results) ? json.results[0] : json;
        const count = Number(work?.cited_by_count);
        if (Number.isFinite(count) && count >= 0) {
          counts.set(resourceKey(resource), count);
          await cacheCitationCount(params.supabase, resource, count);
        }
      } catch {
        // Citation enrichment is optional. Retrieval should never fail because
        // OpenAlex or another citation source is unavailable.
      }
    })
  );

  return counts;
}

export function citationCountFor(
  counts: Map<string, number>,
  resource: CitationLookupResource
) {
  if (resource.doi) {
    const count = counts.get(`doi:${resource.doi.toLowerCase()}`);
    if (typeof count === 'number') return count;
  }
  return counts.get(`pmid:${resource.pmid}`);
}
