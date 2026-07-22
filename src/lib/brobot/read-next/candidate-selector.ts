import { readNextSimilarity } from './candidate-filter';
import type { RankedReadNextCandidate } from './types';

export function selectDiverseReadNextCandidates(input: {
  candidates: RankedReadNextCandidate[];
  max?: number;
  maxPerCategory?: number;
}): RankedReadNextCandidate[] {
  const remaining = [...input.candidates];
  const selected: RankedReadNextCandidate[] = [];
  const categoryCounts = new Map<string, number>();
  const max = input.max ?? 5;
  const maxPerCategory = input.maxPerCategory ?? 2;

  while (remaining.length && selected.length < max) {
    const eligible = remaining.filter(
      (candidate) => (categoryCounts.get(candidate.category) ?? 0) < maxPerCategory
    );
    if (!eligible.length) break;
    eligible.sort((left, right) => {
      const leftSimilarity = selected.reduce(
        (value, item) => Math.max(value, readNextSimilarity(left.canonicalPrompt, item.canonicalPrompt)), 0
      );
      const rightSimilarity = selected.reduce(
        (value, item) => Math.max(value, readNextSimilarity(right.canonicalPrompt, item.canonicalPrompt)), 0
      );
      const leftSelectionScore = left.rankScore - leftSimilarity * 0.18;
      const rightSelectionScore = right.rankScore - rightSimilarity * 0.18;
      return rightSelectionScore - leftSelectionScore ||
        left.category.localeCompare(right.category) ||
        left.displayLabel.localeCompare(right.displayLabel) ||
        left.internalId.localeCompare(right.internalId);
    });
    const next = eligible[0];
    selected.push(next);
    categoryCounts.set(next.category, (categoryCounts.get(next.category) ?? 0) + 1);
    remaining.splice(remaining.findIndex((candidate) => candidate.internalId === next.internalId), 1);
  }
  return selected;
}
