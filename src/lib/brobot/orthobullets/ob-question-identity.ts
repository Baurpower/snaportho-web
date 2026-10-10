/**
 * Orthobullets question identity resolver (contract ob-claims-production.v1).
 *
 * Pure: the caller supplies candidate registry rows; this module decides.
 * Never uses stem fuzzy matching. Never creates or updates registry rows.
 * Ambiguity yields CONFLICT (a human decision), never a silent pick.
 */

export type ObRegistryQuestionRow = {
  id: string;
  sourceSlug: string;
  externalQuestionId: string;
  topicSlug: string | null;
  topicNormalized: string | null;
  specialtyNormalized: string | null;
  isActive: boolean;
};

export type ObAliasHit = {
  aliasKind: string;
  aliasValue: string;
  row: ObRegistryQuestionRow;
};

/** Only visible OBQ/SBQ identifiers supplement the native numeric QID. */
export function obRegistryLookupValues(nativeQuestionId: string, aliases: unknown[] = []): string[] {
  const values = [nativeQuestionId];
  for (const alias of aliases) {
    if (typeof alias !== 'string') continue;
    const match = alias.trim().match(/^((?:OBQ|SBQ)\d+)[.-](\d+)$/i);
    if (!match) continue;
    for (const separator of ['-', '.']) {
      const value = `${match[1]}${separator}${match[2]}`;
      values.push(value.toUpperCase(), value.toLowerCase());
    }
  }
  return [...new Set(values)];
}

export type ObIdentityInput = {
  nativeQuestionId: string;
  /** Canonical locator is DERIVED from the qid; observed URL is evidence only. */
  observedLocator?: string | null;
  topicSlug?: string | null;
  topicNormalized?: string | null;
  nativeRows: ObRegistryQuestionRow[];
  aliasHits: ObAliasHit[];
};

export type ObIdentityMethod =
  | 'registry_native_exact'
  | 'registry_alias_exact'
  | 'no_registry_match'
  | 'native_id_ambiguous'
  | 'alias_ambiguous'
  | 'native_alias_mismatch';

export type ObIdentityConfidence = 'high' | 'medium' | 'low';

export type ObIdentityResult = {
  outcome: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT';
  registryQuestionId: string | null;
  method: ObIdentityMethod;
  confidence: ObIdentityConfidence;
  evidence: string[];
  locator: string;
  conflictingIds: string[];
};

/** Canonical review locator, derived deterministically from the qid. */
export function canonicalReviewLocator(nativeQuestionId: string): string {
  return `https://www.orthobullets.com/testview?qid=${encodeURIComponent(nativeQuestionId)}`;
}

export function resolveObQuestionIdentity(input: ObIdentityInput): ObIdentityResult {
  const locator = canonicalReviewLocator(input.nativeQuestionId);
  const evidence: string[] = [];
  if (input.observedLocator && input.observedLocator !== locator) {
    evidence.push('observed_locator_variant');
  }
  const activeNative = input.nativeRows.filter(
    (row) => row.isActive && row.externalQuestionId === input.nativeQuestionId,
  );
  const nativeIds = [...new Set(activeNative.map((row) => row.id))];
  const aliasRows = input.aliasHits.filter((hit) => hit.row.isActive).map((hit) => hit.row);
  const aliasIds = [...new Set(aliasRows.map((row) => row.id))];

  if (nativeIds.length > 1) {
    return {
      outcome: 'CONFLICT', registryQuestionId: null, method: 'native_id_ambiguous',
      confidence: 'low', evidence: [...evidence, 'multiple_native_rows'], locator,
      conflictingIds: nativeIds,
    };
  }
  if (nativeIds.length === 0 && aliasIds.length > 1) {
    return {
      outcome: 'CONFLICT', registryQuestionId: null, method: 'alias_ambiguous',
      confidence: 'low', evidence: [...evidence, 'multiple_alias_rows'], locator,
      conflictingIds: aliasIds,
    };
  }
  if (nativeIds.length === 1 && aliasIds.some((id) => id !== nativeIds[0])) {
    return {
      outcome: 'CONFLICT', registryQuestionId: null, method: 'native_alias_mismatch',
      confidence: 'low', evidence: [...evidence, 'native_alias_disagree'], locator,
      conflictingIds: [...new Set([...nativeIds, ...aliasIds])],
    };
  }
  if (nativeIds.length === 0 && aliasIds.length === 0) {
    return {
      outcome: 'UNRESOLVED', registryQuestionId: null, method: 'no_registry_match',
      confidence: 'low', evidence, locator, conflictingIds: [],
    };
  }
  const resolvedId = nativeIds[0] ?? aliasIds[0];
  const method: ObIdentityMethod = nativeIds.length === 1 ? 'registry_native_exact' : 'registry_alias_exact';
  const row = (nativeIds.length === 1 ? activeNative : aliasRows).find((candidate) => candidate.id === resolvedId)!;
  evidence.push(nativeIds.length === 1 ? 'native_match' : 'alias_match');
  let confidence: ObIdentityConfidence = 'high';
  // Topic corroboration: supporting evidence only, never a resolver or a veto.
  const packetTopic = (input.topicSlug ?? '').toLowerCase() || null;
  const rowTopic = (row.topicSlug ?? '').toLowerCase() || null;
  if (packetTopic && rowTopic) {
    if (packetTopic === rowTopic) evidence.push('topic_corroborated');
    else {
      evidence.push('topic_mismatch');
      confidence = 'medium';
    }
  } else if (packetTopic || rowTopic) {
    evidence.push('topic_partial');
    confidence = 'medium';
  }
  if (method === 'registry_alias_exact') {
    evidence.push('alias_singleton');
    if (confidence === 'high') confidence = 'medium';
  }
  return {
    outcome: 'RESOLVED', registryQuestionId: resolvedId, method,
    confidence, evidence, locator, conflictingIds: [],
  };
}
