import type { ReadingTopicContext } from './topic-context';

export type PubMedArticle = {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  publicationTypes: string[];
  abstractText?: string;
  doi?: string;
  url: string;
};

type FetchLike = typeof fetch;

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

function pubmedParams(extra: Record<string, string>) {
  const params = new URLSearchParams({
    retmode: 'json',
    tool: process.env.NCBI_TOOL || 'brobot-read-next',
    ...extra,
  });
  if (process.env.NCBI_EMAIL) params.set('email', process.env.NCBI_EMAIL);
  if (process.env.NCBI_API_KEY) params.set('api_key', process.env.NCBI_API_KEY);
  return params;
}

export function exactSearchTerms(topic: ReadingTopicContext) {
  const terms = topic.pubmedQueryFocus?.length
    ? topic.pubmedQueryFocus
    : [topic.displayTopic, ...topic.aliases];

  return Array.from(
    new Set(
      terms
        .map((term) => term.replace(/^"|"$/g, '').trim())
        .filter((term) => term.length > 0)
    )
  );
}

export function buildPubMedQuery(
  topic: ReadingTopicContext,
  field: 'Title/Abstract' | 'All Fields' = 'Title/Abstract',
  options: { includeQualityFilter?: boolean; includeLowQualityTypes?: boolean } = {}
) {
  const topicQuery = exactSearchTerms(topic)
    .map((term) => `"${term}"[${field}]`)
    .join(' OR ');
  const includeQualityFilter = options.includeQualityFilter ?? true;
  const qualityQuery = [
    'review[Publication Type]',
    'systematic review[Publication Type]',
    'meta-analysis[Publication Type]',
    'guideline[Publication Type]',
    '"current concepts"[Title/Abstract]',
    '"management"[Title/Abstract]',
    '"treatment"[Title/Abstract]',
  ].join(' OR ');
  const excludedLowQuality = [
    'case reports[Publication Type]',
    'letter[Publication Type]',
    'editorial[Publication Type]',
    'comment[Publication Type]',
  ].join(' OR ');
  const evidenceClause = includeQualityFilter ? ` AND (${qualityQuery})` : '';
  const exclusionClause = options.includeLowQualityTypes ? '' : ` NOT (${excludedLowQuality})`;

  return `((${topicQuery})${evidenceClause})${exclusionClause}`;
}

export async function searchPubMed(params: {
  topic: ReadingTopicContext;
  field?: 'Title/Abstract' | 'All Fields';
  retmax?: number;
  fetchImpl?: FetchLike;
}): Promise<string[]> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const query = buildPubMedQuery(params.topic, params.field ?? 'Title/Abstract');
  const url = `${EUTILS_BASE}/esearch.fcgi?${pubmedParams({
    db: 'pubmed',
    sort: 'relevance',
    retmax: String(params.retmax ?? 10),
    term: query,
  })}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`PubMed search failed: ${response.status}`);
  const json = await response.json();
  const ids = Array.isArray(json?.esearchresult?.idlist) ? json.esearchresult.idlist : [];
  return ids.map(String).filter(Boolean);
}

export async function summarizePubMed(params: {
  pmids: string[];
  fetchImpl?: FetchLike;
}): Promise<PubMedArticle[]> {
  if (params.pmids.length === 0) return [];
  const fetchImpl = params.fetchImpl ?? fetch;
  const url = `${EUTILS_BASE}/esummary.fcgi?${pubmedParams({
    db: 'pubmed',
    id: params.pmids.join(','),
  })}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`PubMed summary failed: ${response.status}`);
  const json = await response.json();
  const result = json?.result && typeof json.result === 'object' ? json.result : {};

  return params.pmids
    .map((pmid) => result[pmid])
    .filter(Boolean)
    .map((item: Record<string, unknown>): PubMedArticle | null => {
      const uid = String(item.uid ?? '');
      const title = String(item.title ?? '').trim();
      const journal = String(item.fulljournalname || item.source || '').trim();
      const pubdate = String(item.pubdate ?? '');
      const year = Number(/\b(18|19|20|21)\d{2}\b/.exec(pubdate)?.[0]);
      const publicationTypes = Array.isArray(item.pubtype) ? item.pubtype.map(String) : [];
      const authors = Array.isArray(item.authors)
        ? item.authors
            .map((author) =>
              author && typeof author === 'object' && 'name' in author
                ? String((author as { name?: unknown }).name)
                : ''
            )
            .filter(Boolean)
        : [];
      const articleIds = Array.isArray(item.articleids) ? item.articleids : [];
      const doi = articleIds
        .map((articleId) =>
          articleId && typeof articleId === 'object' ? (articleId as Record<string, unknown>) : {}
        )
        .find((articleId) => articleId.idtype === 'doi')?.value;

      if (!uid || !title || !journal || !year) return null;
      return {
        pmid: uid,
        title,
        authors,
        journal,
        year,
        publicationTypes,
        doi: typeof doi === 'string' ? doi : undefined,
        url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      };
    })
    .filter((article): article is PubMedArticle => Boolean(article));
}

function extractAbstractsFromXml(xml: string): Map<string, string> {
  const abstracts = new Map<string, string>();
  const articleBlocks = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) ?? [];

  articleBlocks.forEach((block) => {
    const pmid = /<PMID[^>]*>([^<]+)<\/PMID>/.exec(block)?.[1];
    const parts = Array.from(block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g))
      .map((match) =>
        match[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean);
    if (pmid && parts.length > 0) abstracts.set(pmid, parts.join(' '));
  });

  return abstracts;
}

export async function fetchPubMedAbstracts(params: {
  pmids: string[];
  fetchImpl?: FetchLike;
}): Promise<Map<string, string>> {
  if (params.pmids.length === 0) return new Map();
  const fetchImpl = params.fetchImpl ?? fetch;
  const url = `${EUTILS_BASE}/efetch.fcgi?${pubmedParams({
    db: 'pubmed',
    retmode: 'xml',
    id: params.pmids.join(','),
  })}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`PubMed abstract fetch failed: ${response.status}`);
  return extractAbstractsFromXml(await response.text());
}

export async function retrievePubMedArticles(params: {
  topic: ReadingTopicContext;
  fetchImpl?: FetchLike;
  retmax?: number;
}) {
  let pmids = await searchPubMed({ ...params, field: 'Title/Abstract' });
  if (pmids.length === 0) {
    pmids = await searchPubMed({ ...params, field: 'All Fields' });
  }
  const articles = await summarizePubMed({ pmids, fetchImpl: params.fetchImpl });
  const abstracts = await fetchPubMedAbstracts({ pmids, fetchImpl: params.fetchImpl }).catch(
    () => new Map<string, string>()
  );

  return articles.map((article) => ({
    ...article,
    abstractText: abstracts.get(article.pmid),
  }));
}
