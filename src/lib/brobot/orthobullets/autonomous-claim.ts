import { CLINICAL_CLAIM_PREDICATES, CLINICAL_CLAIM_TYPES } from '@/lib/education/contracts/clinical-claim-v1';

export const ORTHOBULLETS_AUTONOMOUS_CLAIM_VERSION = 'orthobullets-autonomous-claim.v2';
export const AUTO_ACCEPT_MIN_CONFIDENCE = 0.9;

const ENTITY_TYPES = new Set([
  'condition', 'procedure', 'anatomy_structure', 'classification_system', 'classification_grade',
  'complication', 'diagnostic_test', 'imaging_finding', 'implant', 'fixation_method',
  'treatment_principle', 'biomechanics_concept', 'exam_maneuver', 'surgical_approach',
  'surgical_positioning',
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
