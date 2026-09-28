import { CLINICAL_CLAIM_PREDICATES, CLINICAL_CLAIM_TYPES } from '@/lib/education/contracts/clinical-claim-v1';

export const ORTHOBULLETS_AUTONOMOUS_CLAIM_VERSION = 'orthobullets-autonomous-claim.v4';
export const AUTO_ACCEPT_MIN_CONFIDENCE = 0.9;
export const ORTHOBULLETS_CLAIM_COHORT_LIMIT = 25;
export const ORTHOBULLETS_CLAIM_RUN_MAX = 100;

const ENTITY_TYPES = new Set([
  'condition', 'procedure', 'anatomy_structure', 'classification_system', 'classification_grade',
  'complication', 'diagnostic_test', 'imaging_finding', 'implant', 'fixation_method',
  'treatment_principle', 'biomechanics_concept', 'exam_maneuver', 'surgical_approach',
  'surgical_positioning', 'symptom',
]);
const QUALIFIER_KEYS = new Set(['anatomy', 'age_group', 'setting', 'severity', 'laterality', 'procedure', 'contraindication']);

export type AutonomousClaimDraft = {
  claimText: string;
  claimType: string;
  predicate: string;
  objectText: string;
  qualifiers: Record<string, string>;
  primaryEntityLabel: string;
  primaryEntityType: string;
  confidence: number;
};

export type ResolvedAutonomousClaimDraft = AutonomousClaimDraft & {
  primaryEntityId: string;
};

export type AutonomousClaimCritique = {
  accepted: boolean;
  confidence: number;
  reasonCodes: string[];
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function normalizeEntityLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+/-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function lightEntityLabel(value: string) {
  return normalizeEntityLabel(value).replace(/^the /, '');
}

export function safeTopicHint(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length < 3 || compact.length > 120) return null;
  if ((compact.match(/[•|;]/g) ?? []).length >= 2) return null;
  if ((compact.match(/\b(?:flap|fixation|arthroplasty|reconstruction|treatment)\b/gi) ?? []).length >= 3) return null;
  return compact;
}

export type ApprovedEntityRecord = {
  id: string;
  preferredLabel: string;
  entityType: string;
  normalizedLabel: string;
};

export type EntityCandidate = ApprovedEntityRecord & {
  strength: 'exact' | 'direct' | 'weak';
};

export function assembleEntityCandidates(input: {
  labels: string[];
  approved: ApprovedEntityRecord[];
  links: Array<ApprovedEntityRecord & { path: 'direct_exact' | 'curriculum_node_bridge' }>;
}): { candidates: EntityCandidate[]; outcome: 'exact' | 'choose' | 'ambiguous' | 'none' } {
  const wanted = new Set(input.labels.map(lightEntityLabel).filter((label) => label.length >= 3));
  const exact = input.approved.filter((entity) =>
    wanted.has(lightEntityLabel(entity.normalizedLabel)) || wanted.has(lightEntityLabel(entity.preferredLabel)));
  const uniqueExact = [...new Map(exact.map((entity) => [entity.id, entity])).values()];
  if (uniqueExact.length > 1) return { candidates: [], outcome: 'ambiguous' };
  if (uniqueExact.length === 1) return { candidates: [{ ...uniqueExact[0], strength: 'exact' }], outcome: 'exact' };
  const ranked: EntityCandidate[] = [
    ...input.links.filter((link) => link.path === 'direct_exact').map((link) => ({ ...link, strength: 'direct' as const })),
    ...input.links.filter((link) => link.path === 'curriculum_node_bridge').map((link) => ({ ...link, strength: 'weak' as const })),
  ];
  const unique = [...new Map(ranked.map((entity) => [entity.id, entity])).values()].slice(0, 8);
  if (!unique.length) return { candidates: [], outcome: 'none' };
  return { candidates: unique, outcome: 'choose' };
}

export function assertionText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function assertionIdentity(input: {
  claimText: string;
  claimType: string;
  primaryEntityId: string;
  predicate: string;
  objectText: string;
  qualifiers?: Record<string, string>;
}) {
  const qualifiers = Object.entries(input.qualifiers ?? {})
    .filter(([, value]) => value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value.toLowerCase().replace(/[^a-z0-9+/ -]+/g, ' ').replace(/\s+/g, ' ').trim()}`)
    .join(';');
  return [
    `type=${input.claimType.toLowerCase().replace(/[^a-z0-9+/ -]+/g, ' ').replace(/\s+/g, ' ').trim()}`,
    `entity=${input.primaryEntityId.toLowerCase()}`,
    `predicate=${input.predicate.toLowerCase().replace(/[^a-z0-9+/ -]+/g, ' ').replace(/\s+/g, ' ').trim()}`,
    `object=${input.objectText.toLowerCase().replace(/[^a-z0-9+/ -]+/g, ' ').replace(/\s+/g, ' ').trim()}`,
    `qualifiers=${qualifiers}`,
    `assertion=${assertionText(input.claimText)}`,
  ].join('\n');
}

const AGE_VIGNETTE = /\b\d{1,3}\s*-?\s*years?\s*-?\s*old\b/i;
const OCCUPATION_VIGNETTE = /\b(?:male|female)\s+(?:laborer|carpenter|farmer|mechanic)\b/i;

export function vignetteRejectionCodes(claimText: string) {
  const reasons: string[] = [];
  if (AGE_VIGNETTE.test(claimText)) reasons.push('age_vignette');
  if (OCCUPATION_VIGNETTE.test(claimText)) reasons.push('occupation_vignette');
  return reasons;
}

export function parseAutonomousClaimDraft(value: unknown): AutonomousClaimDraft | null {
  const row = object(value);
  if (!row) return null;
  const claimText = typeof row.claimText === 'string' ? row.claimText.trim() : '';
  const claimType = typeof row.claimType === 'string' ? row.claimType.trim() : '';
  const predicate = typeof row.predicate === 'string' ? row.predicate.trim() : '';
  const objectText = typeof row.objectText === 'string' ? row.objectText.trim() : '';
  const primaryEntityLabel = typeof row.primaryEntityLabel === 'string' ? row.primaryEntityLabel.trim() : '';
  const primaryEntityType = typeof row.primaryEntityType === 'string' ? row.primaryEntityType.trim() : '';
  const confidence = Number(row.confidence);
  const rawQualifiers = object(row.qualifiers) ?? {};
  const qualifiers = Object.fromEntries(Object.entries(rawQualifiers)
    .filter(([key, item]) => QUALIFIER_KEYS.has(key) && typeof item === 'string' && item.trim().length > 0 && item.trim().length <= 80)
    .map(([key, item]) => [key, String(item).trim()]));
  if (claimText.length < 20 || claimText.length > 500) return null;
  if (!(CLINICAL_CLAIM_TYPES as readonly string[]).includes(claimType)) return null;
  if (!(CLINICAL_CLAIM_PREDICATES as readonly string[]).includes(predicate)) return null;
  if (!objectText || objectText.length > 200) return null;
  if (!primaryEntityLabel || primaryEntityLabel.length > 200 || !ENTITY_TYPES.has(primaryEntityType)) return null;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  return { claimText, claimType, predicate, objectText, qualifiers, primaryEntityLabel, primaryEntityType, confidence };
}

export function parseAutonomousClaimCritique(value: unknown): AutonomousClaimCritique | null {
  const row = object(value);
  if (!row || typeof row.accepted !== 'boolean') return null;
  const confidence = Number(row.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  const reasonCodes = Array.isArray(row.reasonCodes)
    ? [...new Set(row.reasonCodes.filter((item): item is string => typeof item === 'string' && /^[a-z0-9_:-]{1,80}$/i.test(item)))].slice(0, 12)
    : [];
  return { accepted: row.accepted, confidence, reasonCodes };
}

export function machineConsensus(draft: AutonomousClaimDraft, critique: AutonomousClaimCritique) {
  const confidence = Math.min(draft.confidence, critique.confidence);
  return {
    accepted: critique.accepted && confidence >= AUTO_ACCEPT_MIN_CONFIDENCE,
    confidence: Number(confidence.toFixed(3)),
    reasonCodes: critique.reasonCodes,
  };
}

export function sourceFingerprintPayload(input: {
  stem?: string;
  answerChoices?: Array<{ key?: string; label?: string | null; text?: string }>;
  correctAnswer?: string | null;
  explanationText?: string | null;
}) {
  return JSON.stringify({
    stem: input.stem ?? '',
    choices: (input.answerChoices ?? []).map((choice) => ({ key: choice.key ?? choice.label ?? '', text: choice.text ?? '' })),
    correctAnswer: input.correctAnswer ?? '',
    explanationText: input.explanationText ?? '',
  });
}
