import type { BroBotBranchOption } from '../chat/types';
import { adaptLegacyBranchesToReadNextCandidates } from './adapters';
import { filterReadNextCandidates } from './candidate-filter';
import { rankReadNextCandidates } from './candidate-ranker';
import { selectDiverseReadNextCandidates } from './candidate-selector';
import type { ReadNextContextPacket, ReadNextShadowSummary } from './types';

export function isReadNextShadowEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BROBOT_READ_NEXT_V2_SHADOW === 'true';
}

export function evaluateReadNextShadow(input: {
  branches: BroBotBranchOption[];
  context: ReadNextContextPacket;
}): ReadNextShadowSummary {
  const startedAt = performance.now();
  const result = filterReadNextCandidates({
    candidates: adaptLegacyBranchesToReadNextCandidates(input.branches),
    context: input.context,
  });
  const selected = selectDiverseReadNextCandidates({
    candidates: rankReadNextCandidates({ candidates: result.accepted, context: input.context }),
  });
  const rejectionCounts: ReadNextShadowSummary['rejectionCounts'] = {};
  const acceptedCategoryCounts: ReadNextShadowSummary['acceptedCategoryCounts'] = {};
  const selectedCategoryCounts: ReadNextShadowSummary['selectedCategoryCounts'] = {};
  for (const item of result.rejected) rejectionCounts[item.code] = (rejectionCounts[item.code] ?? 0) + 1;
  for (const item of result.accepted) acceptedCategoryCounts[item.category] = (acceptedCategoryCounts[item.category] ?? 0) + 1;
  for (const item of selected) selectedCategoryCounts[item.category] = (selectedCategoryCounts[item.category] ?? 0) + 1;
  const currentIds = input.branches.map((branch) => branch.id);
  const selectedIds = selected.map((candidate) => candidate.internalId);
  const selectedIdSet = new Set(selectedIds);
  const latencyMs = performance.now() - startedAt;
  const latencyBucket = latencyMs < 5 ? 'lt_5ms' : latencyMs < 10 ? 'lt_10ms' : latencyMs < 25 ? 'lt_25ms' : 'gte_25ms';
  return {
    schemaVersion: 1,
    algorithmVersion: 'read_next_filter_v1',
    enabled: true,
    inputCount: input.branches.length,
    acceptedCount: result.accepted.length,
    rejectedCount: result.rejected.length,
    rejectionCounts,
    acceptedCategoryCounts,
    selectedCount: selected.length,
    exactPositionMatches: selectedIds.filter((id, index) => currentIds[index] === id).length,
    sameSetCount: currentIds.filter((id) => selectedIdSet.has(id)).length,
    selectedCategoryCounts,
    latencyBucket,
  };
}
