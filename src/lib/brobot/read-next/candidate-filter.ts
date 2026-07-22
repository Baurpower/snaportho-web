import type {
  ReadNextCandidateV2,
  ReadNextContextPacket,
  ReadNextRejectionCode,
} from './types';

export type ReadNextRejectedCandidate = {
  candidate: ReadNextCandidateV2;
  code: ReadNextRejectionCode;
};

const GENERIC = /^(tell me more|learn more|what next|next steps?|more details?|read more)\??$/i;
const UNSAFE_URGENT_CATEGORIES = new Set(['quiz', 'adjacent_topic', 'deepen', 'apply']);

export function normalizeReadNextText(value: string): string {
  return value.toLowerCase().replace(/\b(?:the|a|an)\b/g, ' ').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function readNextSimilarity(left: string, right: string): number {
  const a = new Set(normalizeReadNextText(left).split(' ').filter((token) => token.length > 2));
  const b = new Set(normalizeReadNextText(right).split(' ').filter((token) => token.length > 2));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / Math.max(a.size, b.size);
}

function rejectionForCandidate(
  candidate: ReadNextCandidateV2,
  context: ReadNextContextPacket,
  accepted: ReadNextCandidateV2[]
): ReadNextRejectionCode | null {
  const label = candidate.displayLabel.trim();
  const prompt = candidate.canonicalPrompt.trim();
  if (!candidate.internalId || label.length < 4 || prompt.length < 4 || label.length > 120 || prompt.length > 300) return 'invalid_candidate';
  if (GENERIC.test(label)) return 'generic_candidate';
  if (normalizeReadNextText(label) !== normalizeReadNextText(prompt)) return 'label_prompt_mismatch';
  // During a staged quiz the assistant is waiting for the learner's response.
  // Any parallel Read Next action competes with that interaction, even if its
  // category is also quiz-like.
  if (context.stagedQuiz) return 'interaction_incompatible';
  if (normalizeReadNextText(prompt) === normalizeReadNextText(context.latestUserRequest) || readNextSimilarity(prompt, context.latestUserRequest) >= 0.88) return 'repeats_latest_request';
  if (context.answeredQuestions.some((question) => readNextSimilarity(prompt, question) >= 0.82)) return 'already_answered';
  if (accepted.some((item) => normalizeReadNextText(item.canonicalPrompt) === normalizeReadNextText(prompt))) return 'duplicate_exact';
  if (accepted.some((item) => readNextSimilarity(item.canonicalPrompt, prompt) >= 0.72)) return 'duplicate_near';
  if (context.previouslyExposedHashes.includes(candidate.internalId)) return 'previously_exposed';
  if (candidate.category === 'evidence' && !candidate.evidenceAvailable) return 'evidence_unavailable';
  if (context.compare && candidate.category === 'adjacent_topic') return 'interaction_incompatible';
  if (context.explicitCorrection && candidate.category === 'adjacent_topic') return 'conflicts_with_correction';
  if (context.patientSpecific && candidate.patientSpecific && !candidate.urgencyCompatible) return 'patient_specific_unsafe';
  if (context.urgent && (!candidate.urgencyCompatible || UNSAFE_URGENT_CATEGORIES.has(candidate.category))) return 'urgent_context_suppressed';
  if (context.activeTopic && readNextSimilarity(prompt, context.activeTopic) === 0 && readNextSimilarity(prompt, context.latestUserRequest) < 0.12) return 'stale_context';
  return null;
}

export function filterReadNextCandidates(input: {
  candidates: ReadNextCandidateV2[];
  context: ReadNextContextPacket;
}): { accepted: ReadNextCandidateV2[]; rejected: ReadNextRejectedCandidate[] } {
  const accepted: ReadNextCandidateV2[] = [];
  const rejected: ReadNextRejectedCandidate[] = [];
  for (const candidate of input.candidates) {
    const code = rejectionForCandidate(candidate, input.context, accepted);
    if (code) rejected.push({ candidate, code });
    else accepted.push(candidate);
  }
  return { accepted, rejected };
}
