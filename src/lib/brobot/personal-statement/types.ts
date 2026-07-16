import { z } from 'zod';

export const PERSONAL_STATEMENT_PROMPT_VERSION = 'ps-review-3.1.0';
export const PERSONAL_STATEMENT_SCHEMA_VERSION = '3.1.0';
export const PERSONAL_STATEMENT_COMPARISON_PROMPT_VERSION = 'ps-compare-1.0.0';
export const PERSONAL_STATEMENT_COMPARISON_SCHEMA_VERSION = '1.0.0';
export const PERSONAL_STATEMENT_MIN_WORDS = 150;
export const PERSONAL_STATEMENT_MAX_WORDS = 1_500;
export const PERSONAL_STATEMENT_MAX_CHARACTERS = 12_000;
export const PERSONAL_STATEMENT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const AI_WRITING_DISCLAIMER = 'This review identifies style patterns, not authorship. It cannot determine whether AI was used.';

const short = z.string().min(1).max(500);
const medium = z.string().min(1).max(1_000);
const quote = z.string().min(1).max(350).nullable();
const paragraph = z.number().int().min(1).max(100).nullable();
const guidance = z.enum(['strong', 'generally_strong', 'mixed', 'needs_work', 'significant_concern']);
const confidence = z.enum(['broadly_applicable', 'common_reviewer_preference', 'style_dependent', 'high_confidence_concern']);

export const AssessmentLevelSchema = z.object({ level: z.enum(['minor_concern', 'worth_reviewing', 'likely_noticeable']), explanation: medium });

export const AiWritingFindingSchema = z.object({
  id: z.string().min(1).max(80),
  patternLabel: z.string().min(1).max(160),
  evidenceExcerpts: z.array(z.string().min(1).max(350)).min(1).max(5),
  category: z.enum(['reflection_language', 'em_dash_overuse', 'ai_narrative_arc', 'ted_talk_cadence', 'sentence_uniformity', 'three_part_lists', 'contrast_structures', 'excessive_polish', 'abstract_virtue_density', 'consultant_language', 'marketing_language', 'generic_orthopaedic_pattern', 'overly_clean_chronology', 'voice_homogeneity']),
  severity: z.enum(['minor_concern', 'worth_reviewing', 'likely_noticeable']),
  detectedCount: z.number().int().min(1).max(100),
  metric: short,
  repetition: z.enum(['isolated', 'repeated', 'structural']),
  whyAssociatedWithAi: medium,
  readerReaction: short,
  authenticCounterbalance: medium,
  recommendation: medium,
});

export const ReviewFindingSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  explanation: medium,
  confidence,
  verifiedQuote: quote,
  paragraphNumber: paragraph,
  tradeoff: short,
  whatToPreserve: short,
  revisionPrinciple: short,
});

const PreferenceFindingSchema = z.object({
  id: z.string().min(1).max(80), topic: z.string().min(1).max(160),
  traditionalReviewerReaction: medium, narrativeReviewerReaction: medium,
  tradeoff: medium, recommendation: medium,
});

const QualityEvidenceSchema = z.object({
  quality: z.string().min(1).max(100), status: z.enum(['claimed', 'demonstrated', 'both', 'missing']),
  evidence: z.array(z.string().min(1).max(350)).max(4), explanation: medium,
});

const GenericPhraseFindingSchema = z.object({
  phrase: z.string().min(1).max(200), paragraphNumber: paragraph,
  whyItFeelsFamiliar: medium, keepOrRevise: z.enum(['keep', 'revise', 'remove']),
});

export const ReviewerLensSchema = z.object({
  likelyReaction: medium, strengths: z.array(short).min(1).max(5), concerns: z.array(short).min(1).max(5), overallRead: guidance,
});

const RevisionPrioritySchema = z.object({
  rank: z.number().int().min(1).max(5), title: z.string().min(1).max(160),
  whyItMatters: medium, tradeoff: medium, action: medium, preserve: medium,
});

const CoachingPromptSchema = z.object({
  target: z.string().min(1).max(240), explanation: medium, questions: z.array(short).min(1).max(3),
  strategies: z.array(short).min(1).max(3), goal: short, restrainedExample: medium.nullable(), factBoundary: short,
});

export const PersonalStatementReviewSchema = z.object({
  version: z.literal('3.1.0'),
  promptVersion: z.literal(PERSONAL_STATEMENT_PROMPT_VERSION),
  overview: z.object({
    authenticityConclusion: z.enum(['consistently_personal', 'mostly_personal_some_polished_sections', 'mixed_personal_and_machine_polished', 'highly_formulaic', 'difficult_to_distinguish']),
    writingPatternConcern: z.enum(['minor_concern', 'worth_reviewing', 'likely_noticeable']),
    distinctiveness: guidance, evidenceStrength: guidance, themeClarity: guidance, reviewerRisk: guidance, readiness: guidance,
    coreMessage: medium, strongestElement: medium, biggestConcern: medium, reviewerPreferenceWarning: medium,
  }),
  aiLikeWriting: z.object({
    disclaimer: z.literal(AI_WRITING_DISCLAIMER),
    overallSummary: medium,
    categories: z.object({
      emDashOveruse: AssessmentLevelSchema, aiNarrativeArc: AssessmentLevelSchema,
      repeatedReflectionLanguage: AssessmentLevelSchema, tedTalkCadence: AssessmentLevelSchema,
      sentenceUniformity: AssessmentLevelSchema, threePartLists: AssessmentLevelSchema,
      contrastStructures: AssessmentLevelSchema, excessivePolish: AssessmentLevelSchema,
      abstractVirtueDensity: AssessmentLevelSchema, consultantLanguage: AssessmentLevelSchema,
      marketingLanguage: AssessmentLevelSchema, genericOrthopaedicPatterns: AssessmentLevelSchema,
      overlyCleanChronology: AssessmentLevelSchema, voiceHomogeneity: AssessmentLevelSchema,
    }),
    findings: z.array(AiWritingFindingSchema).max(5),
  }),
  authenticStrengths: z.array(ReviewFindingSchema).min(1).max(8),
  broadlyApplicableFindings: z.array(ReviewFindingSchema).max(10),
  preferenceDependentFindings: z.array(PreferenceFindingSchema).min(1).max(8),
  themeAnalysis: z.object({
    primaryThemes: z.array(short).min(1).max(5), repeatedThemes: z.array(short).max(5), unclearThemes: z.array(short).max(5),
    claimedQualities: z.array(QualityEvidenceSchema).max(10), demonstratedQualities: z.array(QualityEvidenceSchema).max(10),
  }),
  genericLanguage: z.object({
    phrases: z.array(GenericPhraseFindingSchema).max(12), familiarNarratives: z.array(ReviewFindingSchema).max(6),
    overallDistinctiveness: z.enum(['highly_distinctive', 'somewhat_distinctive', 'mixed', 'mostly_familiar', 'highly_generic']),
  }),
  reviewerLenses: z.object({ balanced: ReviewerLensSchema, traditional: ReviewerLensSchema, narrativeFocused: ReviewerLensSchema, skepticalProgramDirector: ReviewerLensSchema }),
  revisionPriorities: z.array(RevisionPrioritySchema).min(3).max(5),
  coachingPrompts: z.array(CoachingPromptSchema).min(1).max(6),
});

export const PersonalStatementComparisonSchema = z.object({
  version: z.literal('1.0.0'),
  summary: z.object({ overallTradeoff: medium, recommendedDirection: medium }),
  dimensions: z.object({
    authenticity: z.object({ strongerDraft: z.enum(['a','b','tie']), explanation: medium }),
    distinctiveness: z.object({ strongerDraft: z.enum(['a','b','tie']), explanation: medium }),
    evidence: z.object({ strongerDraft: z.enum(['a','b','tie']), explanation: medium }),
    conservativeSafety: z.object({ strongerDraft: z.enum(['a','b','tie']), explanation: medium }),
    memorability: z.object({ strongerDraft: z.enum(['a','b','tie']), explanation: medium }),
    aiLikeWritingRisk: z.object({ higherRiskDraft: z.enum(['a','b','tie']), explanation: medium }),
  }),
  whatImproved: z.array(short).max(6), whatWasLost: z.array(short).max(6),
  keepFromDraftA: z.array(short).min(1).max(6), keepFromDraftB: z.array(short).min(1).max(6),
  removeFromBoth: z.array(short).max(6), recommendedSynthesis: medium,
});

export type PersonalStatementReview = z.infer<typeof PersonalStatementReviewSchema>;
export type PersonalStatementComparison = z.infer<typeof PersonalStatementComparisonSchema>;
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;
export type AiWritingFinding = z.infer<typeof AiWritingFindingSchema>;
export type ReviewerLens = z.infer<typeof ReviewerLensSchema>;

export type SavedPersonalStatementReview = {
  id: string; sourceType: 'paste' | 'docx' | 'pdf' | 'txt'; originalFilename: string | null;
  statementText: string; statementHash: string; wordCount: number; model: string;
  promptVersion: string; reviewSchemaVersion: string; review: PersonalStatementReview; createdAt: string;
};
