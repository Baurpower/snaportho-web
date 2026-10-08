import type { BroBotKgFeatureMode } from './contracts';

export const BROBOT_KG_RETRIEVAL_DEADLINE_MS = Math.min(
  Math.max(Number(process.env.BROBOT_KG_RETRIEVAL_DEADLINE_MS) || 275, 50),
  1_000,
);

export function getBroBotKgFeatureMode(): BroBotKgFeatureMode {
  const configured = (
    process.env.BROBOT_KNOWLEDGE_V2_MODE ?? process.env.BROBOT_KG_MODE
  )
    ?.trim()
    .toLowerCase();
  if (
    configured === 'off' ||
    configured === 'shadow' ||
    configured === 'enabled'
  )
    return configured;
  return 'enabled';
}

export function getBroBotClaimsGroundingMode(): BroBotKgFeatureMode {
  const configured =
    process.env.BROBOT_CLAIMS_GROUNDING_MODE?.trim().toLowerCase();
  if (
    configured === 'off' ||
    configured === 'shadow' ||
    configured === 'enabled'
  )
    return configured;
  return 'enabled';
}

export function getBroBotClaimAnkiMode(): BroBotKgFeatureMode {
  const configured = process.env.BROBOT_CLAIM_ANKI_MODE?.trim().toLowerCase();
  if (
    configured === 'off' ||
    configured === 'shadow' ||
    configured === 'enabled'
  )
    return configured;
  return 'enabled';
}

export type BroBotKnowledgeRetrievalVersion = 'v2' | 'v3';

export function getBroBotKnowledgeRetrievalVersion(): BroBotKnowledgeRetrievalVersion {
  const configured =
    process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION?.trim().toLowerCase();
  if (configured === 'v3') return 'v3';
  return 'v2';
}

export function getBroBotKnowledgeHealthSnapshot() {
  const kgMode = getBroBotKgFeatureMode();
  const claimsGroundingMode = getBroBotClaimsGroundingMode();
  const claimAnkiMode = getBroBotClaimAnkiMode();
  const retrievalVersion = getBroBotKnowledgeRetrievalVersion();
  const warnings: string[] = [];
  if (claimsGroundingMode === 'enabled' && kgMode !== 'enabled')
    warnings.push('grounding_enabled_while_kg_not_enabled');
  if (claimAnkiMode === 'enabled' && claimsGroundingMode !== 'enabled')
    warnings.push('anki_enabled_without_grounded_claims');
  if (process.env.NODE_ENV === 'production' && retrievalVersion !== 'v3')
    warnings.push('production_not_using_v3');
  return {
    kgMode,
    claimsGroundingMode,
    claimAnkiMode,
    retrievalVersion,
    retrievalDeadlineMs: BROBOT_KG_RETRIEVAL_DEADLINE_MS,
    warnings,
    healthy: warnings.length === 0,
  };
}
