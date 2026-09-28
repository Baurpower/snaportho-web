/**
 * Immutable production contract ob-claims-production.v1.
 *
 * This module is FROZEN: additive v1.x clarifications only, never silent
 * reinterpretation. It deliberately duplicates (not imports) the small guard
 * behaviors it depends on, frozen at v5.1 behavior, so pilot-module edits
 * can never change production semantics without a contract bump.
 *
 * Pure: no I/O, no model calls, no Date.now() inside validators (timestamps
 * are validated as strings; creation stamps come from callers).
 */

import { createHash } from 'node:crypto';

import {
  normalizeClinicalClaimText,
  semanticClaimFingerprintHash,
} from '../../education/contracts/clinical-claim-v1';

export const OB_PROD_CONTRACT_VERSION = 'ob-claims-production.v1' as const;
export const OB_PROD_ALGORITHM = 'orthobullets-claims-prod.v1' as const;
export const OB_PROD_PROMPT_GENERATOR = 'ob-claims-prod-generator-v1.0' as const;
export const OB_PROD_PROMPT_REVIEW = 'ob-claims-prod-review-v1.0' as const;
export const OB_PROD_PROMPT_COVERAGE = 'ob-claims-prod-coverage-v1.0' as const;
export const OB_PROD_PROMPT_REPAIR = 'ob-claims-prod-repair-v1.0' as const;
export const OB_PROD_PROMPT_VALIDATOR = 'ob-claims-prod-validator-v1.0' as const;
export const OB_PROD_PROMPT_SET = 'ob-claims-prod-prompts-v1.0' as const;

/** Marker predicate enrolling v5 claims in exact-identity indexes (documented). */
export const OB_PROD_PREDICATE_MARKER = 'v5_assertion' as const;

export const OB_PROD_MIN_TEXT = 20;
export const OB_PROD_MAX_TEXT = 500;
export const OB_PROD_MAX_DRAFTS = 8;
export const OB_PROD_MAX_REPAIRS_PER_CANDIDATE = 1;

export const OB_PROD_CLAIM_TYPES = [
  'diagnosis', 'treatment_indication', 'treatment_contraindication', 'anatomy',
  'risk_factor', 'complication', 'prognosis', 'classification', 'imaging',
  'physical_exam', 'biomechanics', 'epidemiology', 'pathophysiology',
  'threshold', 'operative_technique', 'postoperative_management',
] as const;
export type ObProdClaimType = (typeof OB_PROD_CLAIM_TYPES)[number];

export const OB_PROD_QUALIFIER_KEYS = [
  'anatomy', 'age_group', 'setting', 'severity', 'laterality', 'procedure', 'contraindication',
] as const;
export type ObProdQualifierKey = (typeof OB_PROD_QUALIFIER_KEYS)[number];
export type ObProdQualifiers = Partial<Record<ObProdQualifierKey, string>>;

export const OB_PROD_SUPPORT_SECTIONS = ['stem', 'choices', 'correct_answer', 'explanation', 'topic'] as const;
export type ObProdSupportSection = (typeof OB_PROD_SUPPORT_SECTIONS)[number];

export const OB_PROD_IMPORTANCE = ['primary', 'secondary'] as const;
export type ObProdImportance = (typeof OB_PROD_IMPORTANCE)[number];

export const OB_PROD_FACTUAL = ['supported', 'unsupported', 'ambiguous'] as const;
export type ObProdFactual = (typeof OB_PROD_FACTUAL)[number];

export const OB_PROD_QUALITY = ['good', 'rewrite', 'split', 'remove'] as const;
export type ObProdQuality = (typeof OB_PROD_QUALITY)[number];

export const OB_PROD_COVERAGE = ['complete', 'missing_major_concept', 'overextracted', 'internally_conflicting'] as const;
export type ObProdCoverage = (typeof OB_PROD_COVERAGE)[number];

export const OB_PROD_FINAL = ['accept', 'abstain'] as const;
export type ObProdFinal = (typeof OB_PROD_FINAL)[number];

export const OB_PROD_EXTRACTION_STATES = ['accepted', 'ai_review_unresolved', 'failed'] as const;
export type ObProdExtractionState = (typeof OB_PROD_EXTRACTION_STATES)[number];

export const OB_PROD_EQUIVALENCE = ['equivalent', 'related_but_distinct', 'contradictory', 'uncertain'] as const;
export type ObProdEquivalence = (typeof OB_PROD_EQUIVALENCE)[number];

export const OB_PROD_RESOLUTION = ['reuse', 'create', 'unresolved'] as const;
export type ObProdResolution = (typeof OB_PROD_RESOLUTION)[number];

export const OB_PROD_IDENTITY = ['RESOLVED', 'UNRESOLVED', 'CONFLICT'] as const;
export type ObProdIdentity = (typeof OB_PROD_IDENTITY)[number];

/** Categorical item statuses. Confidence-driven machine approval states are banned. */
export const OB_PROD_ITEM_STATUS = [
  'pending', 'leased', 'extracting', 'reviewing', 'resolving', 'persisting',
  'accepted', 'ai_review_unresolved', 'identity_unresolved', 'identity_conflict',
  'failed_transient', 'failed_permanent',
] as const;
export type ObProdItemStatus = (typeof OB_PROD_ITEM_STATUS)[number];

export const OB_PROD_RUN_STATUS = ['running', 'paused', 'completed', 'completed_with_gaps', 'failed', 'cancelled'] as const;
export type ObProdRunStatus = (typeof OB_PROD_RUN_STATUS)[number];

export const OB_PROD_DIAGNOSTICS = [
  'model_429', 'model_timeout', 'model_malformed', 'model_empty', 'model_refused',
  'db_timeout', 'db_error', 'source_fetch_failed', 'source_incomplete',
  'identity_unresolved', 'identity_conflict', 'review_unresolved', 'lease_lost',
  'lease_expired', 'budget_exceeded', 'safety_violation', 'persistence_failed',
  'attempts_exhausted', 'worker_stopped',
] as const;
export type ObProdDiagnostic = (typeof OB_PROD_DIAGNOSTICS)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ObProdSourceIdentity = {
  provider: 'orthobullets';
  nativeQuestionId: string;
  registryQuestionId: string | null;
  sourceHash: string;
  /** Sanitized https Orthobullets URL (testview?qid=...), never raw input. */
  reviewLocator: string;
};

export type ObProdStageUsage = {
  modelCalls: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number | null;
};

export type ObProdUsage = {
  generator: ObProdStageUsage;
  review: ObProdStageUsage;
  coverage: ObProdStageUsage;
  repair: ObProdStageUsage;
  validator: ObProdStageUsage;
};

/** Resolution is a post-extraction step; its model identity lives on resolution records. */
export const OB_PROD_PROMPT_EQUIVALENCE = 'ob-claims-prod-equivalence-v1.0' as const;

export type ObProdResolutionRecord = {
  candidateId: string;
  model: string;
  promptVersion: string;
  examinedClaimId: string | null;
  verdict: ObProdEquivalence | 'exact_identity';
  reason: string;
  decision: ObProdResolution;
  resolvedClaimId: string | null;
  usage: ObProdStageUsage;
};

export type ObProdRepairRecord = {
  stage: 'quality_repair';
  action: 'rewrite' | 'split';
  beforeText: string;
  afterTexts: string[];
  reason: string;
  repairedAt: string;
};

export type ObProdCandidate = {
  candidateId: string;
  index: number;
  text: string;
  importance: ObProdImportance;
  claimType: ObProdClaimType;
  qualifiers: ObProdQualifiers;
  support: ObProdSupportSection[];
  generator: { model: string; promptVersion: string; confidence: number };
  factual: { verdict: ObProdFactual; reason: string };
  quality: { verdict: ObProdQuality; reason: string };
  repairs: ObProdRepairRecord[];
  /** Final per-candidate state after any repair + re-review. */
  finalFactual: ObProdFactual;
  finalQuality: ObProdQuality;
  validator: { verdict: ObProdFinal; reason: string };
  accepted: boolean;
};

export type ObProdExtraction = {
  contractVersion: typeof OB_PROD_CONTRACT_VERSION;
  attemptId: string;
  attemptNo: number;
  supersedesAttemptId: string | null;
  algorithmVersion: typeof OB_PROD_ALGORITHM;
  promptVersions: { generator: string; review: string; coverage: string; repair: string; validator: string };
  models: { generator: string; reviewer: string; coverage: string; repair: string; validator: string };
  source: ObProdSourceIdentity;
  startedAt: string;
  completedAt: string;
  candidates: ObProdCandidate[];
  coverage: { verdict: ObProdCoverage; notes: string; missingConcepts: string[] };
  finalState: ObProdExtractionState;
  usage: ObProdUsage;
  diagnostics: ObProdDiagnostic[];
};

// ---------------------------------------------------------------------------
// Deterministic identities
// ---------------------------------------------------------------------------

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Deterministic UUID (v4-shaped nibbles) from a sha256 hex digest. */
export function uuidFromHash(hex: string): string {
  const h = hex.toLowerCase().replace(/[^0-9a-f]/g, '').padEnd(32, '0').slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function extractionAttemptId(input: {
  provider: string;
  nativeQuestionId: string;
  sourceHash: string;
  algorithmVersion: string;
  promptSetVersion: string;
  attemptNo: number;
}): string {
  return uuidFromHash(sha256Hex([
    input.provider, input.nativeQuestionId, input.sourceHash,
    input.algorithmVersion, input.promptSetVersion, String(input.attemptNo),
  ].join('\n')));
}

export function candidateId(input: { attemptId: string; index: number; text: string; claimType: string; importance: string }): string {
  const normalized = input.text.toLowerCase().replace(/\s+/g, ' ').trim();
  return uuidFromHash(sha256Hex([input.attemptId, String(input.index), normalized, input.claimType, input.importance].join('\n')));
}

/**
 * Exact durable claim identity. Mirrors the DB triggers byte-for-byte:
 * - structural: `educational_claim_fingerprint_payload` legacy variant
 *   (non-v3/v4 algorithm). concat_ws SKIPS the entity line when
 *   primary_entity_id is NULL, so v5 rows hash 4 lines, not 5.
 * - semantic: pinned `semanticClaimFingerprintHash` v1 twin.
 * The database remains authoritative (triggers re-stamp on insert); this is
 * the application-side twin for candidate identity and pre-checks.
 */
export function structuralPayloadV5(input: { claimType: string; objectText: string; qualifiers: ObProdQualifiers }): string {
  const qualifierStr = Object.entries(input.qualifiers)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${normalizeClinicalClaimText(value as string)}`)
    .join(';');
  return [
    `type=${normalizeClinicalClaimText(input.claimType)}`,
    `predicate=${normalizeClinicalClaimText(OB_PROD_PREDICATE_MARKER)}`,
    `object=${normalizeClinicalClaimText(input.objectText)}`,
    `qualifiers=${qualifierStr}`,
  ].join('\n');
}

/** v5 object_text derivation (documented): normalized claim text, ≤200 chars. */
export function objectTextV5(claimText: string): string {
  return claimText.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
}

export function exactDurableIdentity(input: { claimText: string; claimType: string; qualifiers: ObProdQualifiers }): {
  normalizedText: string;
  structuralHash: string;
  semanticHash: string;
} {
  const normalizedText = input.claimText.toLowerCase().replace(/\s+/g, ' ').trim();
  const structuralHash = sha256Hex(structuralPayloadV5({
    claimType: input.claimType,
    objectText: objectTextV5(input.claimText),
    qualifiers: input.qualifiers,
  }));
  const semanticHash = semanticClaimFingerprintHash({
    claimText: input.claimText,
    claimType: input.claimType,
    qualifiers: input.qualifiers,
  });
  return { normalizedText, structuralHash, semanticHash };
}

/** Deterministic question→claim link key (DB enforces the active edge unique). */
export function questionClaimLinkKey(input: { provider: string; nativeQuestionId: string; claimId: string }): string {
  return sha256Hex([input.provider, input.nativeQuestionId, input.claimId.toLowerCase()].join('\n'));
}

// ---------------------------------------------------------------------------
// Validators (frozen safety behavior; mirrors v5.1 guards)
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/;
const NATIVE_QID_RE = /^[A-Za-z0-9._:-]{1,200}$/;
const ARTICLE_AGE_ROLE = /\b(a|an)\s+\d{1,3}\s*-?\s*(year-old|years?\s*-?\s*old)\s+(man|woman|male|female|boy|girl|child|patient)\b/i;
const AGE_PATTERN = /\b\d{1,3}\s*-?\s*(year-old|years?\s*-?\s*old)\b/i;
const PRESENTATION_VERB = /\b(presents?|presented|complains?|reports?|sustains?|sustained|fell|falls?|injured|arrives?|admitted|struck)\b/i;
const OCCUPATION_VIGNETTE = /\b(?:male|female)\s+(?:laborer|carpenter|farmer|mechanic)\b/i;
const FORBIDDEN_METADATA_KEYS = new Set([
  'stem', 'question', 'questiontext', 'answer', 'answertext', 'answerchoices', 'choices',
  'correctanswer', 'selectedanswer', 'explanation', 'image', 'images', 'rawhtml',
  'cardbody', 'front', 'back',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Frozen vignette check (v5.1 semantics): specific-patient patterns only. */
export function vignetteFlagsContractV1(claimText: string): string[] {
  const codes: string[] = [];
  if (OCCUPATION_VIGNETTE.test(claimText)) codes.push('occupation_vignette');
  if (ARTICLE_AGE_ROLE.test(claimText)) codes.push('age_vignette');
  else if (AGE_PATTERN.test(claimText) && PRESENTATION_VERB.test(claimText)) codes.push('presentation_vignette');
  return codes;
}

export function containsProtectedContent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsProtectedContent);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN_METADATA_KEYS.has(key.toLowerCase()) || containsProtectedContent(nested),
  );
}

export function isObProdQualifiers(value: unknown): value is ObProdQualifiers {
  if (!isRecord(value) || containsProtectedContent(value)) return false;
  return Object.entries(value).every(([key, nested]) => (
    (OB_PROD_QUALIFIER_KEYS as readonly string[]).includes(key)
    && typeof nested === 'string'
    && nested.trim().length > 0
    && nested.length <= 80
  ));
}

export function isObProdSourceIdentity(value: unknown): value is ObProdSourceIdentity {
  if (!isRecord(value)) return false;
  if (value.provider !== 'orthobullets') return false;
  if (typeof value.nativeQuestionId !== 'string' || !NATIVE_QID_RE.test(value.nativeQuestionId)) return false;
  if (value.registryQuestionId !== null && (typeof value.registryQuestionId !== 'string' || !UUID_RE.test(value.registryQuestionId))) return false;
  if (typeof value.sourceHash !== 'string' || !SHA256_RE.test(value.sourceHash)) return false;
  if (typeof value.reviewLocator !== 'string') return false;
  try {
    const url = new URL(value.reviewLocator);
    if (url.protocol !== 'https:' || url.hostname !== 'www.orthobullets.com') return false;
    if (!url.pathname.startsWith('/testview')) return false;
  } catch {
    return false;
  }
  return true;
}

function isStageUsage(value: unknown): value is ObProdStageUsage {
  if (!isRecord(value)) return false;
  for (const key of ['modelCalls', 'promptTokens', 'completionTokens']) {
    if (!Number.isInteger(value[key]) || (value[key] as number) < 0) return false;
  }
  return value.estimatedCostUsd === null
    || (typeof value.estimatedCostUsd === 'number' && Number.isFinite(value.estimatedCostUsd) && value.estimatedCostUsd >= 0);
}

function isObProdCandidate(value: unknown): value is ObProdCandidate {
  if (!isRecord(value)) return false;
  if (typeof value.candidateId !== 'string' || !UUID_RE.test(value.candidateId)) return false;
  if (!Number.isInteger(value.index) || (value.index as number) < 0) return false;
  if (typeof value.text !== 'string' || value.text.length < OB_PROD_MIN_TEXT || value.text.length > OB_PROD_MAX_TEXT) return false;
  if (!(OB_PROD_IMPORTANCE as readonly string[]).includes(value.importance as string)) return false;
  if (!(OB_PROD_CLAIM_TYPES as readonly string[]).includes(value.claimType as string)) return false;
  if (!isObProdQualifiers(value.qualifiers)) return false;
  if (!Array.isArray(value.support) || !value.support.length) return false;
  if (!value.support.every((item: unknown) => (OB_PROD_SUPPORT_SECTIONS as readonly string[]).includes(item as string))) return false;
  if (!isRecord(value.generator) || typeof value.generator.model !== 'string' || typeof value.generator.promptVersion !== 'string') return false;
  if (typeof value.generator.confidence !== 'number') return false;
  for (const stage of ['factual', 'quality'] as const) {
    if (!isRecord(value[stage]) || typeof value[stage].reason !== 'string') return false;
  }
  if (!(OB_PROD_FACTUAL as readonly string[]).includes((value.factual as Record<string, unknown>).verdict as string)) return false;
  if (!(OB_PROD_QUALITY as readonly string[]).includes((value.quality as Record<string, unknown>).verdict as string)) return false;
  if (!Array.isArray(value.repairs) || value.repairs.length > OB_PROD_MAX_REPAIRS_PER_CANDIDATE) return false;
  for (const repair of value.repairs as unknown[]) {
    if (!isRecord(repair) || repair.stage !== 'quality_repair') return false;
    if (repair.action !== 'rewrite' && repair.action !== 'split') return false;
    if (typeof repair.beforeText !== 'string' || !Array.isArray(repair.afterTexts) || !repair.afterTexts.length) return false;
    if (typeof repair.reason !== 'string' || !isIsoDateTime(repair.repairedAt)) return false;
  }
  if (!(OB_PROD_FACTUAL as readonly string[]).includes(value.finalFactual as string)) return false;
  if (!(OB_PROD_QUALITY as readonly string[]).includes(value.finalQuality as string)) return false;
  if (!isRecord(value.validator) || !(OB_PROD_FINAL as readonly string[]).includes(value.validator.verdict as string)) return false;
  if (typeof value.validator.reason !== 'string' || typeof value.accepted !== 'boolean') return false;
  return true;
}

/** Full extraction validation INCLUDING acceptance-state consistency. */
export function isObProdExtraction(value: unknown): value is ObProdExtraction {
  if (!isRecord(value) || containsProtectedContent(value)) return false;
  if (value.contractVersion !== OB_PROD_CONTRACT_VERSION) return false;
  if (typeof value.attemptId !== 'string' || !UUID_RE.test(value.attemptId)) return false;
  if (!Number.isInteger(value.attemptNo) || (value.attemptNo as number) < 0) return false;
  if (value.supersedesAttemptId !== null && (typeof value.supersedesAttemptId !== 'string' || !UUID_RE.test(value.supersedesAttemptId))) return false;
  if (value.algorithmVersion !== OB_PROD_ALGORITHM) return false;
  if (!isRecord(value.promptVersions) || !isRecord(value.models)) return false;
  for (const key of ['generator', 'review', 'coverage', 'repair', 'validator']) {
    if (typeof (value.promptVersions as Record<string, unknown>)[key] !== 'string') return false;
  }
  for (const key of ['generator', 'reviewer', 'coverage', 'repair', 'validator']) {
    if (typeof (value.models as Record<string, unknown>)[key] !== 'string') return false;
  }
  if (!isObProdSourceIdentity(value.source)) return false;
  if (!isIsoDateTime(value.startedAt) || !isIsoDateTime(value.completedAt)) return false;
  if (!Array.isArray(value.candidates) || value.candidates.length > 32) return false;
  if (!value.candidates.every(isObProdCandidate)) return false;
  if (!isRecord(value.coverage)) return false;
  if (!(OB_PROD_COVERAGE as readonly string[]).includes(value.coverage.verdict as string)) return false;
  if (typeof value.coverage.notes !== 'string' || !Array.isArray(value.coverage.missingConcepts)) return false;
  if (!(OB_PROD_EXTRACTION_STATES as readonly string[]).includes(value.finalState as string)) return false;
  if (!isRecord(value.usage)) return false;
  for (const key of ['generator', 'review', 'coverage', 'repair', 'validator']) {
    if (!isStageUsage((value.usage as Record<string, unknown>)[key])) return false;
  }
  if (!Array.isArray(value.diagnostics)) return false;
  if (!value.diagnostics.every((item: unknown) => (OB_PROD_DIAGNOSTICS as readonly string[]).includes(item as string))) return false;
  return isObProdAcceptanceConsistent(value as ObProdExtraction);
}

/**
 * Acceptance consistency: accepted requires every persisted claim supported
 * + quality good, no blocking set defect, validator accept on every claim,
 * and zero safety violations. failed/ai_review_unresolved must NOT claim
 * acceptance. Numeric confidence plays no role.
 */
export function isObProdAcceptanceConsistent(value: ObProdExtraction): boolean {
  const acceptedClaims = value.candidates.filter((candidate) => candidate.accepted);
  if (value.finalState === 'accepted') {
    if (value.coverage.verdict !== 'complete') return false;
    for (const candidate of acceptedClaims) {
      if (candidate.finalFactual !== 'supported') return false;
      if (candidate.finalQuality !== 'good') return false;
      if (candidate.validator.verdict !== 'accept') return false;
      if (vignetteFlagsContractV1(candidate.text).length) return false;
    }
    // Non-accepted candidates may exist (removed), but nothing accepted may be defective.
    return true;
  }
  // Non-accepted extractions must not mark any claim accepted.
  return acceptedClaims.length === 0;
}

/** Deterministic safety checks over final text (length, vignette, protected keys). */
export function safetyChecksContractV1(candidates: ObProdCandidate[]): string[] {
  const violations: string[] = [];
  candidates.forEach((candidate, index) => {
    if (candidate.text.length < OB_PROD_MIN_TEXT || candidate.text.length > OB_PROD_MAX_TEXT) {
      violations.push(`candidate[${index}]:length`);
    }
    for (const code of vignetteFlagsContractV1(candidate.text)) violations.push(`candidate[${index}]:${code}`);
    if (containsProtectedContent(candidate.qualifiers)) violations.push(`candidate[${index}]:protected_qualifier`);
  });
  return violations;
}
