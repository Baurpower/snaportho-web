import { z } from 'zod';

import { BroBotChatModeSchema, BroBotTrainingLevelSchema } from '@/lib/brobot/chat/types';

export const BROBOT_READING_RESOURCE_TYPES = [
  'pubmed_article',
  'landmark_paper',
  'review_article',
  'guideline',
  'society_resource',
  'technique_article',
  'visual_resource',
  'textbook_reference',
  'systematic_review',
  'trial',
  'educational_website',
] as const;

export const BROBOT_READING_ACCESS_TYPES = [
  'free',
  'abstract_only',
  'paywalled',
  'unknown',
] as const;

export const BroBotReadingResourceTypeSchema = z.enum(BROBOT_READING_RESOURCE_TYPES);
export const BroBotReadingAccessSchema = z.enum(BROBOT_READING_ACCESS_TYPES);

export type BroBotReadingResourceType = z.infer<typeof BroBotReadingResourceTypeSchema>;
export type BroBotReadingAccess = z.infer<typeof BroBotReadingAccessSchema>;

export const BroBotReadingRecommendationSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  resourceType: BroBotReadingResourceTypeSchema,
  sourceName: z.string().trim().min(1),
  journal: z.string().trim().optional(),
  year: z.number().int().min(1800).max(2200).optional(),
  url: z.string().trim().url(),
  pmid: z.string().trim().optional(),
  doi: z.string().trim().optional(),
  citationCount: z.number().int().min(0).optional(),
  citationSource: z.string().trim().optional(),
  whyItMatters: z.string().trim().min(1),
  bestFor: z.string().trim().optional(),
  badges: z.array(z.string().trim().min(1)).optional(),
  matchedTerms: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)),
  access: BroBotReadingAccessSchema.default('unknown'),
  rankScore: z.number(),
  rankPosition: z.number().int().min(1),
  sourceOrigin: z.enum(['curated', 'pubmed_live', 'trusted_web_live', 'cached_live']).optional(),
  isLandmark: z.boolean().optional(),
  isBoardRelevant: z.boolean().optional(),
  isTechniqueRelevant: z.boolean().optional(),
});

export type BroBotReadingRecommendation = z.infer<
  typeof BroBotReadingRecommendationSchema
>;

export const BroBotReadingContextSchema = z.object({
  mode: BroBotChatModeSchema.exclude(['auto']).catch('general'),
  trainingLevel: BroBotTrainingLevelSchema,
  topic: z.string().trim().max(180).optional(),
  procedureCategory: z.string().trim().max(80).optional(),
  subintent: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export type BroBotReadingContext = z.infer<typeof BroBotReadingContextSchema>;

export type BroBotReadingResourceRow = {
  id: string;
  title: string;
  resource_type: BroBotReadingResourceType;
  source_name: string;
  journal: string | null;
  year: number | null;
  url: string;
  why_it_matters: string;
  tags: string[] | null;
  modes: string[] | null;
  procedure_categories: string[] | null;
  training_level_min: string | null;
  training_level_max: string | null;
  educational_yield: number | string | null;
  landmark_score: number | string | null;
  board_relevance: number | string | null;
  clinical_relevance: number | string | null;
  technique_relevance: number | string | null;
  access: BroBotReadingAccess | null;
  editorial_status: string | null;
  pmid?: string | null;
  doi?: string | null;
  citation_count?: number | null;
  citation_source?: string | null;
  citation_checked_at?: string | null;
  source_origin?: string | null;
  citation_metadata?: Record<string, unknown> | null;
  retrieval_query?: string | null;
  topic_key?: string | null;
};

export type BroBotReadingGeneratedFrom = 'curated' | 'live' | 'hybrid' | 'cached';

export type RankedBroBotReadingResource = BroBotReadingResourceRow & {
  rankScore: number;
  rankPosition?: number;
};
