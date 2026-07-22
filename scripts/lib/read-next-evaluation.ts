import { createHash } from 'node:crypto';

import { adaptLegacyBranchesToReadNextCandidates } from '@/lib/brobot/read-next/adapters';
import { filterReadNextCandidates, readNextSimilarity } from '@/lib/brobot/read-next/candidate-filter';
import { rankReadNextCandidates } from '@/lib/brobot/read-next/candidate-ranker';
import { selectDiverseReadNextCandidates } from '@/lib/brobot/read-next/candidate-selector';
import type { BroBotBranchOption, BroBotChatMode, BroBotModelMessage, BroBotTrainingLevel } from '@/lib/brobot/chat/types';
import type { RankedReadNextCandidate, ReadNextContextPacket, ReadNextRejectionCode } from '@/lib/brobot/read-next/types';

export type HistoricalReadNextRow = {
  auditId: string;
  conversationAuditId?: string;
  createdAt?: string;
  mode?: string;
  userPrompt: string;
  answer: string;
  structured?: Record<string, unknown>;
  nextLearningBranches?: Array<BroBotBranchOption & Record<string, unknown>>;
};

export type ReadNextCaseResult = {
  caseId: string;
  mode: string;
  learnerLevel: string;
  sourceCompleteness: 'displayed_set_only';
  originalCount: number;
  acceptedCount: number;
  selectedCount: number;
  rejectionCounts: Partial<Record<ReadNextRejectionCode, number>>;
  original: SetMetrics;
  v2: SetMetrics;
  sameSetCount: number;
  exactPositionMatches: number;
  stableAcrossInputOrder: boolean;
  winner: 'current' | 'v2' | 'tie';
  warningCodes: string[];
};

export type SetMetrics = {
  averageRelevance: number;
  averageContinuity: number;
  averageRankUtility: number;
  duplicatePairs: number;
  repeatsLatestRequest: number;
  alreadyAnswered: number;
  unsafeInUrgentContext: number;
  categoryDiversity: number;
  composite: number;
};

export type ReviewCase = {
  caseId: string;
  mode: string;
  learnerLevel: string;
  latestUserRequest: string;
  latestAssistantAnswer: string;
  priorConversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  setA: string[];
  setB: string[];
  assignmentKey: 'current_is_a' | 'v2_is_a';
  deterministicWinner: 'current' | 'v2' | 'tie';
  warningCodes: string[];
};

const MODES = new Set(['auto', 'or_prep', 'oite', 'clinic', 'consult', 'fracture_call', 'research', 'general']);
const LEVELS = new Set(['med_student', 'pgy1', 'pgy2', 'pgy3', 'pgy4', 'pgy5', 'attending']);

export function pseudonym(value: string): string {
  return `rne_${createHash('sha256').update(`read-next-evaluation-v1:${value}`).digest('hex').slice(0, 12)}`;
}

export function sanitizeReviewText(value: string): string {
  return String(value ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, '[REDACTED_PHONE]')
    .replace(/\b(?:mrn|medical record(?: number)?)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/gi, '[REDACTED_MRN]')
    .replace(/\b(?:dob|date of birth)\s*[:#-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, '[REDACTED_DOB]')
    .replace(/\b\d{1,6}\s+[A-Za-z0-9.' -]{2,40}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/gi, '[REDACTED_ADDRESS]');
}

function validMode(value?: string): BroBotChatMode {
  return MODES.has(value ?? '') ? value as BroBotChatMode : 'general';
}

function validLevel(row: HistoricalReadNextRow): BroBotTrainingLevel {
  const value = typeof row.structured?.trainingLevel === 'string' ? row.structured.trainingLevel : 'pgy2';
  return LEVELS.has(value) ? value as BroBotTrainingLevel : 'pgy2';
}

function makeContext(row: HistoricalReadNextRow, history: BroBotModelMessage[]): ReadNextContextPacket {
  const question = row.userPrompt;
  return {
    latestUserRequest: question,
    latestVisibleAnswer: row.answer,
    mode: validMode(row.mode),
    learnerLevel: validLevel(row),
    answeredQuestions: history.filter((item) => item.role === 'user').map((item) => item.content).slice(-8),
    corrections: [], previouslyExposedHashes: [],
    stagedQuiz: /\bquiz me\b/i.test(question) && /\b(wait|one at a time|after i)\b/i.test(question),
    compare: /\b(compare|versus|vs\.?|difference between)\b/i.test(question),
    evidenceRequest: /\b(evidence|articles?|papers?|citations?|references?|pubmed)\b/i.test(question),
    explicitCorrection: /^(?:no\b|wrong\b|actually\b|correction\b|i meant\b)/i.test(question.trim()),
    patientSpecific: /\b(my patient|this patient|\d{1,3}[- ]year[- ]old)\b/i.test(question),
    urgent: /\b(emergency|urgent|immediately|right now|neurovascular|compartment syndrome|open fracture|septic|cauda equina)\b/i.test(question),
  };
}

function metricRound(value: number): number { return Math.round(value * 1000) / 1000; }

function setMetrics(candidates: RankedReadNextCandidate[], context: ReadNextContextPacket): SetMetrics {
  let duplicatePairs = 0;
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      if (readNextSimilarity(candidates[left].canonicalPrompt, candidates[right].canonicalPrompt) >= 0.72) duplicatePairs += 1;
    }
  }
  const denominator = Math.max(1, candidates.length);
  const averageRelevance = candidates.reduce((sum, item) => sum + item.rankFeatures.latestRequestRelevance, 0) / denominator;
  const averageContinuity = candidates.reduce((sum, item) => sum + item.rankFeatures.answerContinuity, 0) / denominator;
  const averageRankUtility = candidates.reduce((sum, item) => sum + item.rankScore, 0) / denominator;
  const repeatsLatestRequest = candidates.filter((item) => readNextSimilarity(item.canonicalPrompt, context.latestUserRequest) >= 0.88).length;
  const alreadyAnswered = candidates.filter((item) => context.answeredQuestions.some((question) => readNextSimilarity(item.canonicalPrompt, question) >= 0.82)).length;
  const unsafeInUrgentContext = context.urgent ? candidates.filter((item) => !item.urgencyCompatible).length : 0;
  const categoryDiversity = candidates.length ? new Set(candidates.map((item) => item.category)).size / candidates.length : 0;
  const penalty = repeatsLatestRequest * 0.2 + alreadyAnswered * 0.15 + duplicatePairs * 0.08 + unsafeInUrgentContext * 0.3;
  return {
    averageRelevance: metricRound(averageRelevance),
    averageContinuity: metricRound(averageContinuity),
    averageRankUtility: metricRound(averageRankUtility),
    duplicatePairs, repeatsLatestRequest, alreadyAnswered, unsafeInUrgentContext,
    categoryDiversity: metricRound(categoryDiversity),
    composite: metricRound(averageRankUtility * 0.75 + categoryDiversity * 0.25 - penalty),
  };
}

function compareSets(current: SetMetrics, v2: SetMetrics, currentCount: number, v2Count: number): 'current' | 'v2' | 'tie' {
  const currentHardFailures = current.unsafeInUrgentContext + current.repeatsLatestRequest + current.alreadyAnswered + current.duplicatePairs;
  const v2HardFailures = v2.unsafeInUrgentContext + v2.repeatsLatestRequest + v2.alreadyAnswered + v2.duplicatePairs;
  if (v2HardFailures !== currentHardFailures) return v2HardFailures < currentHardFailures ? 'v2' : 'current';
  if (currentCount > 0 && v2Count === 0) return 'current';
  if (Math.abs(v2.composite - current.composite) < 0.03) return 'tie';
  return v2.composite > current.composite ? 'v2' : 'current';
}

export function evaluateHistoricalReadNextRow(input: {
  row: HistoricalReadNextRow;
  history: BroBotModelMessage[];
}): { result: ReadNextCaseResult; review: ReviewCase } | null {
  const branches = Array.isArray(input.row.nextLearningBranches) ? input.row.nextLearningBranches : [];
  if (!branches.length) return null;
  const context = makeContext(input.row, input.history);
  const originalCandidates = adaptLegacyBranchesToReadNextCandidates(branches);
  const originalRankFeatures = rankReadNextCandidates({ candidates: originalCandidates, context });
  const rankById = new Map(originalRankFeatures.map((candidate) => [candidate.internalId, candidate]));
  const originalInDisplayedOrder = originalCandidates.map((candidate) => rankById.get(candidate.internalId)!).filter(Boolean);
  const filtered = filterReadNextCandidates({ candidates: originalCandidates, context });
  const selected = selectDiverseReadNextCandidates({ candidates: rankReadNextCandidates({ candidates: filtered.accepted, context }) });
  const reversedSelected = selectDiverseReadNextCandidates({
    candidates: rankReadNextCandidates({ candidates: [...filtered.accepted].reverse(), context }),
  });
  const rejectionCounts: ReadNextCaseResult['rejectionCounts'] = {};
  for (const item of filtered.rejected) rejectionCounts[item.code] = (rejectionCounts[item.code] ?? 0) + 1;
  const originalMetrics = setMetrics(originalInDisplayedOrder, context);
  const v2Metrics = setMetrics(selected, context);
  const originalIds = originalInDisplayedOrder.map((item) => item.internalId);
  const selectedIds = selected.map((item) => item.internalId);
  const selectedSet = new Set(selectedIds);
  const stableAcrossInputOrder = selectedIds.join('|') === reversedSelected.map((item) => item.internalId).join('|');
  const warningCodes = [
    !stableAcrossInputOrder ? 'unstable_order' : '',
    branches.length > 0 && selected.length === 0 ? 'v2_empty_set' : '',
    context.urgent ? 'urgent_context' : '',
    context.patientSpecific ? 'patient_specific_context' : '',
  ].filter(Boolean);
  const winner = compareSets(originalMetrics, v2Metrics, originalIds.length, selectedIds.length);
  const caseId = pseudonym(input.row.auditId);
  const assignmentKey = parseInt(caseId.slice(-1), 16) % 2 === 0 ? 'current_is_a' : 'v2_is_a';
  const originalLabels = originalInDisplayedOrder.map((item) => sanitizeReviewText(item.displayLabel));
  const v2Labels = selected.map((item) => sanitizeReviewText(item.displayLabel));
  return {
    result: {
      caseId, mode: context.mode, learnerLevel: context.learnerLevel,
      sourceCompleteness: 'displayed_set_only', originalCount: originalIds.length,
      acceptedCount: filtered.accepted.length, selectedCount: selectedIds.length,
      rejectionCounts, original: originalMetrics, v2: v2Metrics,
      sameSetCount: originalIds.filter((id) => selectedSet.has(id)).length,
      exactPositionMatches: selectedIds.filter((id, index) => originalIds[index] === id).length,
      stableAcrossInputOrder, winner, warningCodes,
    },
    review: {
      caseId, mode: context.mode, learnerLevel: context.learnerLevel,
      latestUserRequest: sanitizeReviewText(input.row.userPrompt),
      latestAssistantAnswer: sanitizeReviewText(input.row.answer).slice(0, 4000),
      priorConversation: input.history.slice(-6).map((item) => ({
        role: item.role as 'user' | 'assistant',
        content: sanitizeReviewText(item.content).slice(0, 1500),
      })),
      setA: assignmentKey === 'current_is_a' ? originalLabels : v2Labels,
      setB: assignmentKey === 'current_is_a' ? v2Labels : originalLabels,
      assignmentKey, deterministicWinner: winner, warningCodes,
    },
  };
}

export function buildConversationHistory(rows: HistoricalReadNextRow[]): Map<string, BroBotModelMessage[]> {
  const sorted = [...rows].sort((left, right) => String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')));
  const accumulated = new Map<string, BroBotModelMessage[]>();
  const beforeTurn = new Map<string, BroBotModelMessage[]>();
  for (const row of sorted) {
    const conversationKey = row.conversationAuditId ?? row.auditId.split(':')[0];
    const history = accumulated.get(conversationKey) ?? [];
    beforeTurn.set(row.auditId, [...history]);
    accumulated.set(conversationKey, [
      ...history,
      { role: 'user', content: row.userPrompt },
      { role: 'assistant', content: row.answer },
    ].slice(-16));
  }
  return beforeTurn;
}
