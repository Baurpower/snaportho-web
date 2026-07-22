import type { BroBotChatMode, BroBotTrainingLevel } from '../chat/types';

export const READ_NEXT_CATEGORIES = [
  'prerequisite', 'clarify', 'deepen', 'apply', 'compare', 'evidence',
  'complication', 'anatomy', 'technique', 'decision', 'counseling',
  'quiz', 'adjacent_topic',
] as const;

export type ReadNextCategory = (typeof READ_NEXT_CATEGORIES)[number];
export type ReadNextCandidateSource = 'template' | 'database' | 'model' | 'intent' | 'reading';

/** Server-internal only. Never add this type directly to a chat response contract. */
export type ReadNextCandidateV2 = {
  internalId: string;
  displayLabel: string;
  canonicalPrompt: string;
  category: ReadNextCategory;
  sources: ReadNextCandidateSource[];
  provenanceIds: string[];
  evidenceAvailable: boolean;
  patientSpecific: boolean;
  urgencyCompatible: boolean;
  interactionCompatibility: string[];
};

export type ReadNextContextPacket = {
  latestUserRequest: string;
  latestVisibleAnswer: string;
  mode: BroBotChatMode;
  learnerLevel: BroBotTrainingLevel;
  activeTopic?: string;
  answeredQuestions: string[];
  corrections: string[];
  previouslyExposedHashes: string[];
  stagedQuiz: boolean;
  compare: boolean;
  evidenceRequest: boolean;
  explicitCorrection: boolean;
  patientSpecific: boolean;
  urgent: boolean;
};

export type ReadNextRejectionCode =
  | 'invalid_candidate'
  | 'generic_candidate'
  | 'duplicate_exact'
  | 'duplicate_near'
  | 'repeats_latest_request'
  | 'already_answered'
  | 'previously_exposed'
  | 'stale_context'
  | 'conflicts_with_correction'
  | 'interaction_incompatible'
  | 'evidence_unavailable'
  | 'patient_specific_unsafe'
  | 'urgent_context_suppressed'
  | 'label_prompt_mismatch';

export type ReadNextShadowSummary = {
  schemaVersion: 1;
  algorithmVersion: 'read_next_filter_v1';
  enabled: true;
  inputCount: number;
  acceptedCount: number;
  rejectedCount: number;
  rejectionCounts: Partial<Record<ReadNextRejectionCode, number>>;
  acceptedCategoryCounts: Partial<Record<ReadNextCategory, number>>;
  selectedCount: number;
  exactPositionMatches: number;
  sameSetCount: number;
  selectedCategoryCounts: Partial<Record<ReadNextCategory, number>>;
  latencyBucket: 'lt_5ms' | 'lt_10ms' | 'lt_25ms' | 'gte_25ms';
};

export type ReadNextRankFeatures = {
  latestRequestRelevance: number;
  answerContinuity: number;
  clinicalProgression: number;
  modeFit: number;
  learnerLevelFit: number;
  novelty: number;
  evidenceAvailability: number;
};

export type RankedReadNextCandidate = ReadNextCandidateV2 & {
  rankFeatures: ReadNextRankFeatures;
  rankScore: number;
};
