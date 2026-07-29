export type SearchCandidate<T> = {
  id: string;
  value: T;
  sectionId?: string;
  priority: number;
  coverage: number;
  textRank: number;
};

export type RankedSearchCandidate<T> = {
  id: string;
  value: T;
  relevanceScore: number;
  reviewConfidence: number;
  matchedSectionIds: string[];
};

export const QUESTION_SEARCH_MIN_COVERAGE = 0.5;

export function selectConfidentQuestionCandidates<T>(
  candidates: RankedSearchCandidate<T>[],
): RankedSearchCandidate<T>[] {
  return candidates
    .filter((candidate) => candidate.reviewConfidence >= QUESTION_SEARCH_MIN_COVERAGE);
}

export function rankSearchCandidates<T>(
  candidates: SearchCandidate<T>[],
  sectionIds: string[],
  limit: number,
): RankedSearchCandidate<T>[] {
  const grouped = new Map<string, RankedSearchCandidate<T>>();
  for (const candidate of candidates) {
    const contribution = candidate.coverage * candidate.priority + Math.min(candidate.textRank, 1);
    const existing = grouped.get(candidate.id);
    if (existing) {
      existing.relevanceScore += contribution;
      existing.reviewConfidence = Math.max(existing.reviewConfidence, candidate.coverage);
      if (candidate.sectionId && !existing.matchedSectionIds.includes(candidate.sectionId)) {
        existing.matchedSectionIds.push(candidate.sectionId);
      }
      continue;
    }
    grouped.set(candidate.id, {
      id: candidate.id,
      value: candidate.value,
      relevanceScore: contribution,
      reviewConfidence: candidate.coverage,
      matchedSectionIds: candidate.sectionId ? [candidate.sectionId] : [],
    });
  }

  const ranked = [...grouped.values()].sort((left, right) =>
    right.matchedSectionIds.length - left.matchedSectionIds.length
    || right.relevanceScore - left.relevanceScore
    || right.reviewConfidence - left.reviewConfidence
    || left.id.localeCompare(right.id),
  );
  if (!sectionIds.length) return ranked.slice(0, limit);

  const selected: typeof ranked = [];
  const selectedIds = new Set<string>();
  const perSectionLimit = Math.max(3, Math.ceil(limit / sectionIds.length));
  const sectionCounts = new Map(sectionIds.map((sectionId) => [sectionId, 0]));
  for (const sectionId of sectionIds) {
    for (const candidate of ranked.filter((item) =>
      item.matchedSectionIds.includes(sectionId) && !selectedIds.has(item.id)
    ).slice(0, perSectionLimit)) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
      for (const matchedSectionId of candidate.matchedSectionIds) {
        sectionCounts.set(matchedSectionId, (sectionCounts.get(matchedSectionId) ?? 0) + 1);
      }
    }
    if (selected.length >= limit) return selected.slice(0, limit);
  }
  for (const candidate of ranked) {
    if (selectedIds.has(candidate.id)) continue;
    if (
      candidate.matchedSectionIds.length
      && candidate.matchedSectionIds.every((sectionId) =>
        (sectionCounts.get(sectionId) ?? 0) >= perSectionLimit
      )
    ) continue;
    selected.push(candidate);
    for (const matchedSectionId of candidate.matchedSectionIds) {
      sectionCounts.set(matchedSectionId, (sectionCounts.get(matchedSectionId) ?? 0) + 1);
    }
    if (selected.length >= limit) break;
  }
  return selected;
}
