import { z } from 'zod';

export const BROBOT_RESEARCH_SUBMODES = [
  'reference_finder',
  'manuscript_reviewer',
  'literature_review_builder',
  'evidence_synthesis',
  'journal_scout',
  'systematic_review_assistant',
  'statistical_reviewer',
  'research_planning',
] as const;

export const BroBotResearchSubmodeSchema = z.enum(BROBOT_RESEARCH_SUBMODES);

export type BroBotResearchSubmode = z.infer<typeof BroBotResearchSubmodeSchema>;

export type ResearchSubmodeRouteSource = 'deterministic' | 'llm' | 'fallback';

export type ResearchSubmodeRoute = {
  submode: BroBotResearchSubmode;
  confidence: number;
  source: ResearchSubmodeRouteSource;
  matchedRule?: string;
  signals: string[];
};

export const CITATION_CONFIDENCE_VALUES = [
  'verified',
  'usable_with_wording_adjustment',
  'background_only',
  'do_not_cite',
  'unverified',
] as const;

export const CitationConfidenceSchema = z.enum(CITATION_CONFIDENCE_VALUES);
export type CitationConfidence = z.infer<typeof CitationConfidenceSchema>;

export const ResearchCitationCandidateSchema = z.object({
  id: z.string().trim().min(1),
  pmid: z.string().trim().optional(),
  doi: z.string().trim().optional(),
  title: z.string().trim().min(1),
  authors: z.array(z.string().trim().min(1)).optional(),
  journal: z.string().trim().optional(),
  year: z.number().int().min(1800).max(2200).optional(),
  publicationType: z.array(z.string().trim().min(1)).optional(),
  abstractSnippet: z.string().trim().optional(),
  claimSupportScore: z.number().min(0).max(1),
  evidenceLevelScore: z.number().min(0).max(1),
  journalScore: z.number().min(0).max(1),
  citationScore: z.number().min(0).max(1).optional(),
  confidence: CitationConfidenceSchema,
  supportExplanation: z.string().trim().min(1),
});

export type ResearchCitationCandidate = z.infer<typeof ResearchCitationCandidateSchema>;

export const ResearchEvidenceCardSchema = z.object({
  id: z.string().trim().min(1),
  pmid: z.string().trim().optional(),
  doi: z.string().trim().optional(),
  title: z.string().trim().min(1),
  authors: z.array(z.string().trim().min(1)).optional(),
  journal: z.string().trim().optional(),
  year: z.number().int().min(1800).max(2200).optional(),
  publicationType: z.array(z.string().trim().min(1)).optional(),
  subspecialty: z.string().trim().optional(),
  studyDesign: z.string().trim().optional(),
  population: z.string().trim().optional(),
  sampleSize: z.string().trim().optional(),
  interventionOrExposure: z.string().trim().optional(),
  comparator: z.string().trim().optional(),
  outcomes: z.array(z.string().trim().min(1)).optional(),
  mainFinding: z.string().trim().optional(),
  effectSizeOrDirection: z.string().trim().optional(),
  limitations: z.array(z.string().trim().min(1)).optional(),
  claimSupportScore: z.number().min(0).max(1).optional(),
  evidenceLevelScore: z.number().min(0).max(1).optional(),
  journalScore: z.number().min(0).max(1).optional(),
  citationScore: z.number().min(0).max(1).optional(),
  recencyScore: z.number().min(0).max(1).optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  abstractSupportSnippets: z.array(z.string().trim().min(1)).optional(),
});

export type ResearchEvidenceCard = z.infer<typeof ResearchEvidenceCardSchema>;

export function normalizeResearchSubmode(value: unknown): BroBotResearchSubmode | undefined {
  const parsed = BroBotResearchSubmodeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
