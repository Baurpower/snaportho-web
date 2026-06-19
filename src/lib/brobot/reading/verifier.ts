import { normalizeReadingTopic } from './ranker';
import { exactSearchTerms, type PubMedArticle } from './pubmed-client';
import type { ReadingTopicContext } from './topic-context';
import type { BroBotReadingRecommendation, BroBotReadingResourceRow } from './types';

export const TRUSTED_READING_DOMAINS = [
  'orthobullets.com',
  'orthoinfo.aaos.org',
  'aaos.org',
  'ota.org',
  'posna.org',
  'aofas.org',
  'assh.org',
  'nass.org',
  'aana.org',
  'ncbi.nlm.nih.gov',
];

export function isTrustedReadingUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return TRUSTED_READING_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function hasStrongTopicRelevance(input: {
  title: string;
  snippet?: string;
  tags?: string[];
  topic: ReadingTopicContext;
}) {
  const terms = exactSearchTerms(input.topic).map(normalizeReadingTopic);
  const haystack = [input.title, input.snippet ?? '', ...(input.tags ?? [])]
    .map(normalizeReadingTopic)
    .join(' ');
  if (terms.length === 0) return false;
  return terms.some((term) => haystack.includes(term));
}

function includesTerm(value: string, term: string) {
  return normalizeReadingTopic(value).includes(normalizeReadingTopic(term));
}

export type PubMedVerificationResult = {
  accepted: boolean;
  matchedTerms: string[];
  rejectedTerms: string[];
  rejectionReason?: string;
  relevanceScore: number;
};

export function verifyPubMedResultForTopic(
  article: PubMedArticle,
  topic: ReadingTopicContext
): PubMedVerificationResult {
  if (!article.pmid || !article.title || !article.journal || !article.year) {
    return {
      accepted: false,
      matchedTerms: [],
      rejectedTerms: [],
      rejectionReason: 'missing_required_pubmed_metadata',
      relevanceScore: 0,
    };
  }

  if (article.url !== `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`) {
    return {
      accepted: false,
      matchedTerms: [],
      rejectedTerms: [],
      rejectionReason: 'invalid_pubmed_url',
      relevanceScore: 0,
    };
  }

  const title = article.title;
  const abstractText = article.abstractText ?? '';
  const combined = `${title} ${abstractText}`;
  const excludedTerms = topic.excludedTerms.length ? topic.excludedTerms : topic.exclusions;
  const rejectedTerms = excludedTerms.filter((term) => includesTerm(combined, term));
  if (rejectedTerms.length > 0 && !topic.comparisonRequested) {
    return {
      accepted: false,
      matchedTerms: [],
      rejectedTerms,
      rejectionReason: 'excluded_topic_term',
      relevanceScore: 0,
    };
  }

  const exactTerms = exactSearchTerms(topic);
  const titleMatches = exactTerms.filter((term) => includesTerm(title, term));
  const abstractMatches = exactTerms.filter((term) => includesTerm(abstractText, term));
  const matchedTerms = Array.from(new Set([...titleMatches, ...abstractMatches]));
  const relevanceScore = titleMatches.length > 0 ? 1 : abstractMatches.length > 0 ? 0.82 : 0;
  const accepted = matchedTerms.length > 0;

  return {
    accepted,
    matchedTerms,
    rejectedTerms: topic.comparisonRequested ? rejectedTerms : [],
    rejectionReason: accepted ? undefined : 'missing_exact_topic_match',
    relevanceScore,
  };
}

export function verifyPubMedArticle(article: PubMedArticle, topic: ReadingTopicContext) {
  return verifyPubMedResultForTopic(article, topic).accepted;
}

export function verifyTrustedWebResult(result: BroBotReadingRecommendation, topic: ReadingTopicContext) {
  return (
    Boolean(result.title) &&
    isTrustedReadingUrl(result.url) &&
    hasStrongTopicRelevance({
      title: result.title,
      snippet: result.whyItMatters,
      tags: result.tags,
      topic,
    })
  );
}

export function pubMedArticleToResourceRow(
  article: PubMedArticle,
  topic: ReadingTopicContext,
  retrievalQuery: string,
  verification = verifyPubMedResultForTopic(article, topic)
): BroBotReadingResourceRow {
  const publicationTypes = article.publicationTypes.map((type) => type.toLowerCase());
  const isSystematic = publicationTypes.some((type) => type.includes('systematic'));
  const isGuideline = publicationTypes.some((type) => type.includes('guideline'));
  const isReview = publicationTypes.some((type) => type.includes('review'));

  return {
    id: crypto.randomUUID(),
    title: article.title,
    resource_type: isGuideline
      ? 'guideline'
      : isSystematic
        ? 'systematic_review'
        : isReview
          ? 'review_article'
          : 'pubmed_article',
    source_name: 'PubMed',
    journal: article.journal,
    year: article.year,
    url: article.url,
    pmid: article.pmid,
    doi: article.doi ?? null,
    why_it_matters: `${article.journal}${article.year ? `, ${article.year}` : ''}${article.pmid ? ` · PMID ${article.pmid}` : ''}`,
    tags: [
      topic.topicKey,
      ...topic.synonyms.map(normalizeReadingTopic),
      ...verification.matchedTerms.map(normalizeReadingTopic),
      `pmid_${article.pmid}`,
    ],
    modes: ['oite', 'consult', 'clinic', 'research', 'general'],
    procedure_categories: [],
    training_level_min: null,
    training_level_max: null,
    educational_yield: 0,
    landmark_score: 0,
    board_relevance: 0,
    clinical_relevance: 0,
    technique_relevance: 0,
    access: 'abstract_only',
    editorial_status: 'verified',
    source_origin: 'pubmed_live',
    citation_metadata: {
      pmid: article.pmid,
      doi: article.doi ?? null,
      authors: article.authors,
      publicationTypes: article.publicationTypes,
      matchedTerms: verification.matchedTerms,
      relevanceScore: verification.relevanceScore,
    },
    retrieval_query: retrievalQuery,
    topic_key: topic.topicKey,
  };
}
