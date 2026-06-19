import {
  buildPubMedQuery,
  exactSearchTerms,
  retrievePubMedArticles,
  type PubMedArticle,
} from './pubmed-client';
import { citationCountFor, getCitationCounts } from './citation-client';
import { normalizeReadingTopic } from './ranker';
import type { ReadingTopicContext } from './topic-context';
import {
  filterVerifiedTrustedWebResults,
  retrieveTrustedWebResults,
  type TrustedWebSearchResult,
} from './trusted-web-client';
import type {
  BroBotReadingGeneratedFrom,
  BroBotReadingRecommendation,
  BroBotReadingResourceType,
} from './types';
import { verifyPubMedResultForTopic } from './verifier';

type SupabaseLike = unknown;

export const HIGH_IMPACT_ORTHO_JOURNALS = [
  'The Journal of bone and joint surgery. American volume',
  'The bone & joint journal',
  'Clinical orthopaedics and related research',
  'Journal of orthopaedic trauma',
  'Journal of the American Academy of Orthopaedic Surgeons',
  'Journal of shoulder and elbow surgery',
  'The American journal of sports medicine',
  'Arthroscopy',
  'Spine',
  'The spine journal',
  'Journal of arthroplasty',
  'Journal of hand surgery',
  'Foot & ankle international',
  'Journal of pediatric orthopaedics',
  'Injury',
  'JBJS reviews',
  'EFORT open reviews',
  'Bone & joint open',
];

export const ARTICLE_TYPE_WEIGHT = {
  guideline: 1,
  meta_analysis: 0.95,
  systematic_review: 0.9,
  review: 0.8,
  randomized_trial: 0.75,
  cohort_study: 0.65,
  landmark_original: 0.65,
  case_series: 0.35,
  case_report: 0.1,
} as const;

type ArticleQualityType = keyof typeof ARTICLE_TYPE_WEIGHT;

export type ReadingRetrievalResult = {
  recommendationSetId: string;
  topic: string;
  generatedFrom: BroBotReadingGeneratedFrom;
  resources: BroBotReadingRecommendation[];
  retrievalQuery?: string;
};

function normalizedIncludes(value: string | null | undefined, term: string) {
  return normalizeReadingTopic(value).includes(normalizeReadingTopic(term));
}

function includesExactTerm(value: string | null | undefined, topic: ReadingTopicContext) {
  return exactSearchTerms(topic).some((term) => normalizedIncludes(value, term));
}

export function classifyArticle(article: Pick<PubMedArticle, 'publicationTypes' | 'title' | 'abstractText'>): ArticleQualityType {
  const publicationTypes = article.publicationTypes.map((type) => type.toLowerCase()).join(' ');
  const text = `${article.title} ${article.abstractText ?? ''}`.toLowerCase();

  if (/guideline/.test(publicationTypes)) return 'guideline';
  if (/meta-analysis|meta analysis/.test(publicationTypes) || /\bmeta-analysis\b|\bmeta analysis\b/.test(text)) {
    return 'meta_analysis';
  }
  if (/systematic review/.test(publicationTypes) || /\bsystematic review\b/.test(text)) return 'systematic_review';
  if (/randomized|randomised|clinical trial/.test(publicationTypes) || /\brandomi[sz]ed\b/.test(text)) {
    return 'randomized_trial';
  }
  if (/case reports?/.test(publicationTypes) || /\bcase report\b/.test(text)) return 'case_report';
  if (/\bcase series\b/.test(text)) return 'case_series';
  if (/review/.test(publicationTypes) || /\bcurrent concepts\b|\breview\b/.test(text)) return 'review';
  if (/\bcohort\b|\bregistry\b|\bmulticenter\b/.test(text)) return 'cohort_study';
  return 'landmark_original';
}

function pubMedResourceType(article: PubMedArticle): BroBotReadingResourceType {
  const type = classifyArticle(article);
  if (type === 'guideline') return 'guideline';
  if (type === 'meta_analysis' || type === 'systematic_review') return 'systematic_review';
  if (type === 'review') return 'review_article';
  if (type === 'randomized_trial') return 'trial';
  return 'pubmed_article';
}

function journalQuality(journal: string) {
  const normalizedJournal = normalizeReadingTopic(journal);
  return HIGH_IMPACT_ORTHO_JOURNALS.some((candidate) => normalizeReadingTopic(candidate) === normalizedJournal)
    ? 1
    : 0.55;
}

function citationScore(citationCount?: number) {
  if (typeof citationCount !== 'number') return 0;
  return Math.min(1, Math.log10(citationCount + 1) / 4);
}

function recencyOrLandmark(article: PubMedArticle, citationCount?: number) {
  const recency = article.year ? Math.max(0, Math.min(1, (article.year - 2000) / 25)) : 0;
  const landmark = typeof citationCount === 'number' && citationCount >= 250 ? 0.9 : 0;
  return Math.max(recency, landmark);
}

function topicRelevance(article: PubMedArticle, topic: ReadingTopicContext) {
  const title = includesExactTerm(article.title, topic) ? 1 : 0;
  const abstractText = includesExactTerm(article.abstractText, topic) ? 0.82 : 0;
  return Math.max(title, abstractText);
}

function articleScore(article: PubMedArticle, topic: ReadingTopicContext, citationCount?: number) {
  const relevance = topicRelevance(article, topic);
  const articleType = classifyArticle(article);
  const typeQuality = ARTICLE_TYPE_WEIGHT[articleType];
  const journal = journalQuality(article.journal);
  const citations = citationScore(citationCount);
  const timeBalance = recencyOrLandmark(article, citationCount);

  return (
    0.35 * relevance +
    0.2 * typeQuality +
    0.2 * journal +
    0.15 * citations +
    0.1 * timeBalance
  );
}

function passesQualityGate(params: {
  article: PubMedArticle;
  topic: ReadingTopicContext;
  citationCount?: number;
  allowCaseReports: boolean;
}) {
  const relevance = topicRelevance(params.article, params.topic);
  const articleType = classifyArticle(params.article);
  const journal = journalQuality(params.article.journal);

  if (relevance < 0.82) return false;
  if (articleType === 'case_report' && !params.allowCaseReports) return false;
  if (journal < 1 && ARTICLE_TYPE_WEIGHT[articleType] < ARTICLE_TYPE_WEIGHT.review) return false;
  return true;
}

function articleBadges(article: PubMedArticle, citationCount?: number) {
  const badges: string[] = [];
  const type = classifyArticle(article);
  if (type === 'guideline') badges.push('Guideline');
  if (type === 'meta_analysis') badges.push('Meta-analysis');
  if (type === 'systematic_review') badges.push('Systematic Review');
  if (type === 'review') badges.push('Review');
  if (journalQuality(article.journal) === 1) badges.push('High-impact journal');
  if (typeof citationCount === 'number' && citationCount >= 100) badges.push('Highly cited');
  return badges;
}

function articleToRecommendation(
  article: PubMedArticle,
  topic: ReadingTopicContext,
  citationCount: number | undefined,
  rankPosition: number
): BroBotReadingRecommendation {
  const verification = verifyPubMedResultForTopic(article, topic);
  const citationText = typeof citationCount === 'number' ? ` · ${citationCount} citations` : '';

  return {
    id: `pubmed-${article.pmid}`,
    title: article.title,
    resourceType: pubMedResourceType(article),
    sourceName: 'PubMed',
    journal: article.journal,
    year: article.year,
    url: article.url,
    pmid: article.pmid,
    doi: article.doi,
    citationCount,
    citationSource: typeof citationCount === 'number' ? 'OpenAlex' : undefined,
    whyItMatters: `${article.journal}${article.year ? ` · ${article.year}` : ''} · PMID ${article.pmid}${citationText}`,
    badges: articleBadges(article, citationCount),
    tags: [topic.topicKey, ...verification.matchedTerms.map(normalizeReadingTopic), `pmid_${article.pmid}`],
    access: 'abstract_only',
    matchedTerms: process.env.NODE_ENV !== 'production' ? verification.matchedTerms : undefined,
    sourceOrigin: 'pubmed_live',
    rankScore: articleScore(article, topic, citationCount),
    rankPosition,
  };
}

function webResultToRecommendation(
  result: TrustedWebSearchResult,
  topic: ReadingTopicContext,
  rankPosition: number
): BroBotReadingRecommendation {
  const matchedTerms =
    process.env.NODE_ENV !== 'production'
      ? exactSearchTerms(topic).filter((term) => normalizedIncludes(`${result.title} ${result.whyItMatters}`, term))
      : undefined;

  return {
    ...result,
    journal: undefined,
    year: undefined,
    access: 'free',
    sourceOrigin: 'trusted_web_live',
    badges: ['Trusted ortho site'],
    matchedTerms,
    rankScore: includesExactTerm(`${result.title} ${result.whyItMatters}`, topic) ? 0.72 : 0,
    rankPosition,
  };
}

function dedupeAndSort(resources: BroBotReadingRecommendation[], max: number) {
  const byUrl = new Map<string, BroBotReadingRecommendation>();

  resources.forEach((resource) => {
    const existing = byUrl.get(resource.url);
    if (!existing || resource.rankScore > existing.rankScore) byUrl.set(resource.url, resource);
  });

  return Array.from(byUrl.values())
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, max)
    .map((resource, index) => ({ ...resource, rankPosition: index + 1 }));
}

export async function getHybridReadingRecommendations(params: {
  supabase: SupabaseLike;
  topic: ReadingTopicContext;
  max?: number;
  fetchImpl?: typeof fetch;
  citationFetchImpl?: typeof fetch;
}): Promise<ReadingRetrievalResult> {
  const max = params.max ?? 5;
  const retrievalQuery = buildPubMedQuery(params.topic);
  const resources: BroBotReadingRecommendation[] = [];

  try {
    const articles = await retrievePubMedArticles({
      topic: params.topic,
      fetchImpl: params.fetchImpl,
      retmax: 20,
    });
    const citationCounts = await getCitationCounts({
      resources: articles,
      fetchImpl: params.citationFetchImpl ?? params.fetchImpl ?? fetch,
      supabase: params.supabase && typeof params.supabase === 'object'
        ? (params.supabase as Parameters<typeof getCitationCounts>[0]['supabase'])
        : undefined,
    });
    const verified = articles
      .filter((article) => verifyPubMedResultForTopic(article, params.topic).accepted)
      .map((article) => ({
        article,
        citationCount: citationCountFor(citationCounts, article),
      }));
    const highQuality = verified.filter((result) =>
      passesQualityGate({
        article: result.article,
        topic: params.topic,
        citationCount: result.citationCount,
        allowCaseReports: false,
      })
    );
    const allowCaseReports = highQuality.length < 2;

    resources.push(
      ...verified
        .filter((result) =>
          passesQualityGate({
            article: result.article,
            topic: params.topic,
            citationCount: result.citationCount,
            allowCaseReports,
          })
        )
        .map((result, index) =>
          articleToRecommendation(result.article, params.topic, result.citationCount, index + 1)
        )
    );
  } catch (error) {
    console.error('[brobot] PubMed search failed (non-fatal)', error);
  }

  if (resources.length === 0) {
    const trusted = filterVerifiedTrustedWebResults(
      await retrieveTrustedWebResults({ topic: params.topic }).catch(() => []),
      params.topic
    );
    resources.push(...trusted.map((result, index) => webResultToRecommendation(result, params.topic, index + 1)));
  }

  return {
    recommendationSetId: crypto.randomUUID(),
    topic: params.topic.displayTopic,
    generatedFrom: 'live',
    resources: dedupeAndSort(resources, max),
    retrievalQuery,
  };
}
