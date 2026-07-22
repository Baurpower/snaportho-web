import { readNextSimilarity } from './candidate-filter';
import type {
  RankedReadNextCandidate,
  ReadNextCandidateV2,
  ReadNextCategory,
  ReadNextContextPacket,
  ReadNextRankFeatures,
} from './types';

const CLINICAL_PROGRESSION: Record<ReadNextCategory, number> = {
  prerequisite: 1, clarify: 0.95, anatomy: 0.9, decision: 0.88,
  complication: 0.84, technique: 0.82, compare: 0.8, evidence: 0.78,
  apply: 0.76, deepen: 0.72, counseling: 0.7, quiz: 0.66,
  adjacent_topic: 0.35,
};

const MODE_CATEGORY_FIT: Partial<Record<string, ReadNextCategory[]>> = {
  or_prep: ['anatomy', 'technique', 'complication', 'decision'],
  clinic: ['decision', 'counseling', 'compare', 'evidence'],
  consult: ['clarify', 'decision', 'complication', 'anatomy'],
  fracture_call: ['decision', 'complication', 'anatomy', 'technique'],
  oite: ['quiz', 'prerequisite', 'compare', 'complication'],
  research: ['evidence', 'compare', 'deepen', 'apply'],
  general: ['deepen', 'apply', 'compare', 'prerequisite'],
  auto: ['deepen', 'apply', 'compare', 'prerequisite'],
};

const JUNIOR_CATEGORIES = new Set<ReadNextCategory>(['prerequisite', 'clarify', 'anatomy', 'decision']);
const SENIOR_CATEGORIES = new Set<ReadNextCategory>(['technique', 'complication', 'evidence', 'compare', 'apply']);

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Math.round(value * 1000) / 1000;

function modeFit(candidate: ReadNextCandidateV2, context: ReadNextContextPacket): number {
  const preferred = MODE_CATEGORY_FIT[context.mode] ?? MODE_CATEGORY_FIT.general ?? [];
  const index = preferred.indexOf(candidate.category);
  return index < 0 ? 0.45 : 1 - index * 0.1;
}

function learnerLevelFit(candidate: ReadNextCandidateV2, context: ReadNextContextPacket): number {
  if (context.learnerLevel === 'med_student' || context.learnerLevel === 'pgy1') {
    return JUNIOR_CATEGORIES.has(candidate.category) ? 1 : 0.55;
  }
  if (context.learnerLevel === 'pgy4' || context.learnerLevel === 'pgy5' || context.learnerLevel === 'attending') {
    return SENIOR_CATEGORIES.has(candidate.category) ? 1 : 0.65;
  }
  return 0.8;
}

function novelty(candidate: ReadNextCandidateV2, context: ReadNextContextPacket): number {
  const prior = [context.latestUserRequest, ...context.answeredQuestions];
  const maxSimilarity = prior.reduce(
    (maximum, value) => Math.max(maximum, readNextSimilarity(candidate.canonicalPrompt, value)),
    0
  );
  return clamp(1 - maxSimilarity);
}

export function rankReadNextCandidates(input: {
  candidates: ReadNextCandidateV2[];
  context: ReadNextContextPacket;
}): RankedReadNextCandidate[] {
  return input.candidates.map((candidate) => {
    const rankFeatures: ReadNextRankFeatures = {
      latestRequestRelevance: clamp(readNextSimilarity(candidate.canonicalPrompt, input.context.latestUserRequest) * 1.8),
      answerContinuity: clamp(readNextSimilarity(candidate.canonicalPrompt, input.context.latestVisibleAnswer) * 1.8),
      clinicalProgression: CLINICAL_PROGRESSION[candidate.category],
      modeFit: modeFit(candidate, input.context),
      learnerLevelFit: learnerLevelFit(candidate, input.context),
      novelty: novelty(candidate, input.context),
      evidenceAvailability: candidate.category === 'evidence' ? (candidate.evidenceAvailable ? 1 : 0) : 0.7,
    };
    const rankScore = round(
      rankFeatures.latestRequestRelevance * 0.3 +
      rankFeatures.answerContinuity * 0.2 +
      rankFeatures.clinicalProgression * 0.15 +
      rankFeatures.modeFit * 0.1 +
      rankFeatures.learnerLevelFit * 0.1 +
      rankFeatures.novelty * 0.1 +
      rankFeatures.evidenceAvailability * 0.05
    );
    return { ...candidate, rankFeatures, rankScore };
  }).sort((left, right) =>
    right.rankScore - left.rankScore ||
    left.category.localeCompare(right.category) ||
    left.displayLabel.localeCompare(right.displayLabel) ||
    left.internalId.localeCompare(right.internalId)
  );
}
