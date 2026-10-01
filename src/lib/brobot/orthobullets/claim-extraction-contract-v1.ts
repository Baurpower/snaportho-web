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

/**
 * TS mirror of public.ob_claim_text_is_safe (length + vignette patterns).
 * Empty = safe to persist. The DB CHECK applies to EVERY candidate row
 * (claim_text and final_text, accepted or not), so the gate must too —
 * acceptance consistency alone is not sufficient.
 * Length parity note: JS .length counts UTF-16 units, Postgres char_length
 * counts characters; claims are ASCII prose, so they agree in practice.
 */
export function textSafetyFlagsContractV1(text: string): string[] {
  const codes: string[] = [];
  if (text.length < OB_PROD_MIN_TEXT || text.length > OB_PROD_MAX_TEXT) codes.push('length');
  for (const flag of vignetteFlagsContractV1(text)) codes.push(flag);
  return codes;
}

export function containsProtectedContent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsProtectedContent);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN_METADATA_KEYS.has(key.toLowerCase()) || containsProtectedContent(nested),
  );
}

function pathSegment(key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key.slice(0, 40))}]`;
}

/**
 * Dotted path of the first forbidden metadata key, or null when clean.
 * Cycle-safe; path rendering is truncated but the search is exhaustive, so
 * this agrees with containsProtectedContent on every acyclic value.
 */
export function findProtectedKeyPath(value: unknown, path = 'root', seen: Set<object> = new Set()): string | null {
  if (!value || typeof value !== 'object') return null;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findProtectedKeyPath(value[index], `${path}[${index}]`, seen);
      if (hit) return hit.slice(0, 160);
    }
    return null;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) return `${path}${pathSegment(key)}`.slice(0, 160);
    const hit = findProtectedKeyPath(nested, `${path}${pathSegment(key)}`, seen);
    if (hit) return hit.slice(0, 160);
  }
  return null;
}

export function explainObProdQualifiers(value: unknown): string[] {
  if (!isRecord(value)) return ['shape'];
  const codes: string[] = [];
  const hit = findProtectedKeyPath(value);
  if (hit) codes.push(`protected:${hit}`);
  for (const [key, nested] of Object.entries(value)) {
    const short = key.slice(0, 40);
    if (!(OB_PROD_QUALIFIER_KEYS as readonly string[]).includes(key)) codes.push(`key:${short}`);
    else if (typeof nested !== 'string' || nested.trim().length === 0) codes.push(`value:${short}`);
    else if (nested.length > 80) codes.push(`length:${short}`);
  }
  return codes;
}

export function isObProdQualifiers(value: unknown): value is ObProdQualifiers {
  return explainObProdQualifiers(value).length === 0;
}

export function explainObProdSourceIdentity(value: unknown): string[] {
  if (!isRecord(value)) return ['shape'];
  const codes: string[] = [];
  if (value.provider !== 'orthobullets') codes.push('provider');
  if (typeof value.nativeQuestionId !== 'string' || !NATIVE_QID_RE.test(value.nativeQuestionId)) codes.push('native_question_id');
  if (value.registryQuestionId !== null && (typeof value.registryQuestionId !== 'string' || !UUID_RE.test(value.registryQuestionId))) {
    codes.push('registry_question_id');
  }
  if (typeof value.sourceHash !== 'string' || !SHA256_RE.test(value.sourceHash)) codes.push('source_hash');
  if (typeof value.reviewLocator !== 'string') {
    codes.push('review_locator');
  } else {
    try {
      const url = new URL(value.reviewLocator);
      if (url.protocol !== 'https:' || url.hostname !== 'www.orthobullets.com') codes.push('review_locator');
      else if (!url.pathname.startsWith('/testview')) codes.push('review_locator');
    } catch {
      codes.push('review_locator');
    }
  }
  return codes;
}

export function isObProdSourceIdentity(value: unknown): value is ObProdSourceIdentity {
  return explainObProdSourceIdentity(value).length === 0;
}

function explainStageUsage(value: unknown): string[] {
  if (!isRecord(value)) return ['shape'];
  const codes: string[] = [];
  for (const key of ['modelCalls', 'promptTokens', 'completionTokens']) {
    if (!Number.isInteger(value[key]) || (value[key] as number) < 0) codes.push(key);
  }
  const cost = value.estimatedCostUsd;
  if (!(cost === null || (typeof cost === 'number' && Number.isFinite(cost) && cost >= 0))) codes.push('estimatedCostUsd');
  return codes;
}

function explainObProdRepair(value: unknown): string[] {
  if (!isRecord(value)) return ['shape'];
  const codes: string[] = [];
  if (value.stage !== 'quality_repair') codes.push('stage');
  if (value.action !== 'rewrite' && value.action !== 'split') codes.push('action');
  if (typeof value.beforeText !== 'string') {
    codes.push('before_text');
  } else {
    // beforeText persists as claim_text: same DB text CHECK applies.
    if (value.beforeText.length < OB_PROD_MIN_TEXT || value.beforeText.length > OB_PROD_MAX_TEXT) codes.push('before_text_length');
    for (const flag of vignetteFlagsContractV1(value.beforeText)) codes.push(`before_text_safety:${flag}`);
  }
  if (!Array.isArray(value.afterTexts) || !value.afterTexts.length) codes.push('after_texts');
  if (typeof value.reason !== 'string') codes.push('reason');
  if (!isIsoDateTime(value.repairedAt)) codes.push('repaired_at');
  return codes;
}

function explainObProdCandidate(value: unknown): string[] {
  if (!isRecord(value)) return ['shape'];
  const codes: string[] = [];
  if (typeof value.candidateId !== 'string' || !UUID_RE.test(value.candidateId)) codes.push('candidate_id');
  if (!Number.isInteger(value.index) || (value.index as number) < 0) codes.push('index');
  if (typeof value.text !== 'string' || value.text.length < OB_PROD_MIN_TEXT || value.text.length > OB_PROD_MAX_TEXT) {
    codes.push('text_length');
  } else {
    // DB text CHECK applies to every row: vignette text is unpersistable even
    // on dropped/non-accepted candidates (canary-500 Q1704 crashed persist).
    for (const flag of vignetteFlagsContractV1(value.text)) codes.push(`text_safety:${flag}`);
  }
  if (!(OB_PROD_IMPORTANCE as readonly string[]).includes(value.importance as string)) codes.push('importance');
  if (!(OB_PROD_CLAIM_TYPES as readonly string[]).includes(value.claimType as string)) codes.push('claim_type');
  for (const sub of explainObProdQualifiers(value.qualifiers)) codes.push(`qualifiers:${sub}`);
  if (!Array.isArray(value.support) || !value.support.length) {
    codes.push('support_empty');
  } else if (!value.support.every((item: unknown) => (OB_PROD_SUPPORT_SECTIONS as readonly string[]).includes(item as string))) {
    codes.push('support_value');
  }
  if (!isRecord(value.generator) || typeof value.generator.model !== 'string' || typeof value.generator.promptVersion !== 'string') {
    codes.push('generator');
  } else if (typeof value.generator.confidence !== 'number') {
    codes.push('confidence');
  }
  for (const stage of ['factual', 'quality'] as const) {
    if (!isRecord(value[stage]) || typeof (value[stage] as Record<string, unknown>).reason !== 'string') codes.push(`stage:${stage}`);
  }
  const factual = isRecord(value.factual) ? value.factual : null;
  const quality = isRecord(value.quality) ? value.quality : null;
  if (!factual || !(OB_PROD_FACTUAL as readonly string[]).includes(factual.verdict as string)) codes.push('factual');
  if (!quality || !(OB_PROD_QUALITY as readonly string[]).includes(quality.verdict as string)) codes.push('quality');
  if (!Array.isArray(value.repairs) || value.repairs.length > OB_PROD_MAX_REPAIRS_PER_CANDIDATE) {
    codes.push('repairs_shape');
  } else {
    (value.repairs as unknown[]).forEach((repair, repairIndex) => {
      for (const sub of explainObProdRepair(repair)) codes.push(`repair[${repairIndex}]:${sub}`);
    });
  }
  if (!(OB_PROD_FACTUAL as readonly string[]).includes(value.finalFactual as string)) codes.push('final_factual');
  if (!(OB_PROD_QUALITY as readonly string[]).includes(value.finalQuality as string)) codes.push('final_quality');
  const validator = isRecord(value.validator) ? value.validator : null;
  if (!validator || !(OB_PROD_FINAL as readonly string[]).includes(validator.verdict as string)) codes.push('validator');
  else if (typeof validator.reason !== 'string') codes.push('validator_reason');
  if (typeof value.accepted !== 'boolean') codes.push('accepted_flag');
  return codes;
}

/**
 * Full extraction validation INCLUDING acceptance-state consistency.
 * Returns every violated check as a stable code (empty = valid). This is the
 * single source of truth; isObProdExtraction is defined as "no violations".
 */
export function explainObProdExtraction(value: unknown): string[] {
  if (!isRecord(value)) return ['not_record'];
  const codes: string[] = [];
  const hit = findProtectedKeyPath(value);
  if (hit) codes.push(`protected:${hit}`);
  if (value.contractVersion !== OB_PROD_CONTRACT_VERSION) codes.push('contract_version');
  if (typeof value.attemptId !== 'string' || !UUID_RE.test(value.attemptId)) codes.push('attempt_id');
  if (!Number.isInteger(value.attemptNo) || (value.attemptNo as number) < 0) codes.push('attempt_no');
  if (value.supersedesAttemptId !== null && (typeof value.supersedesAttemptId !== 'string' || !UUID_RE.test(value.supersedesAttemptId))) {
    codes.push('supersedes_attempt_id');
  }
  if (value.algorithmVersion !== OB_PROD_ALGORITHM) codes.push('algorithm_version');
  if (!isRecord(value.promptVersions) || !isRecord(value.models)) {
    codes.push('versions_shape');
  } else {
    for (const key of ['generator', 'review', 'coverage', 'repair', 'validator']) {
      if (typeof (value.promptVersions as Record<string, unknown>)[key] !== 'string') codes.push(`prompt_version:${key}`);
    }
    for (const key of ['generator', 'reviewer', 'coverage', 'repair', 'validator']) {
      if (typeof (value.models as Record<string, unknown>)[key] !== 'string') codes.push(`model:${key}`);
    }
  }
  for (const sub of explainObProdSourceIdentity(value.source)) codes.push(`source:${sub}`);
  if (!isIsoDateTime(value.startedAt) || !isIsoDateTime(value.completedAt)) codes.push('timestamps');
  if (!Array.isArray(value.candidates) || value.candidates.length > 32) {
    codes.push('candidates_shape');
  } else {
    (value.candidates as unknown[]).forEach((entry, index) => {
      for (const sub of explainObProdCandidate(entry)) codes.push(`candidate[${index}]:${sub}`);
    });
  }
  const coverage = isRecord(value.coverage) ? value.coverage : null;
  if (!coverage) {
    codes.push('coverage_shape');
  } else {
    if (!(OB_PROD_COVERAGE as readonly string[]).includes(coverage.verdict as string)) codes.push('coverage_verdict');
    if (typeof coverage.notes !== 'string' || !Array.isArray(coverage.missingConcepts)) codes.push('coverage_notes');
  }
  if (!(OB_PROD_EXTRACTION_STATES as readonly string[]).includes(value.finalState as string)) codes.push('final_state');
  if (!isRecord(value.usage)) {
    codes.push('usage_shape');
  } else {
    for (const key of ['generator', 'review', 'coverage', 'repair', 'validator']) {
      for (const sub of explainStageUsage((value.usage as Record<string, unknown>)[key])) codes.push(`usage:${key}:${sub}`);
    }
  }
  if (!Array.isArray(value.diagnostics)) {
    codes.push('diagnostics_shape');
  } else if (!value.diagnostics.every((item: unknown) => (OB_PROD_DIAGNOSTICS as readonly string[]).includes(item as string))) {
    codes.push('diagnostics_value');
  }
  // Acceptance consistency runs only on a shape-clean extraction (mirrors the
  // original gate order, which reached it only after every check above passed).
  if (codes.length === 0) {
    for (const sub of explainObProdAcceptance(value as ObProdExtraction)) codes.push(sub);
  }
  return codes;
}

export function isObProdExtraction(value: unknown): value is ObProdExtraction {
  return explainObProdExtraction(value).length === 0;
}

/**
 * Acceptance consistency: accepted requires every persisted claim supported
 * + quality good, no blocking set defect, validator accept on every claim,
 * and zero safety violations. failed/ai_review_unresolved must NOT claim
 * acceptance. Numeric confidence plays no role.
 */
export function explainObProdAcceptance(value: ObProdExtraction): string[] {
  const codes: string[] = [];
  if (value.finalState === 'accepted') {
    if (value.coverage.verdict !== 'complete') codes.push('accept:coverage');
    value.candidates.forEach((candidate, index) => {
      if (!candidate.accepted) return;
      if (candidate.finalFactual !== 'supported') codes.push(`accept:candidate[${index}]:final_factual`);
      if (candidate.finalQuality !== 'good') codes.push(`accept:candidate[${index}]:final_quality`);
      if (candidate.validator.verdict !== 'accept') codes.push(`accept:candidate[${index}]:validator`);
      for (const flag of vignetteFlagsContractV1(candidate.text)) codes.push(`accept:candidate[${index}]:${flag}`);
    });
    // Non-accepted candidates may exist (removed), but nothing accepted may be defective.
    return codes;
  }
  // Non-accepted extractions must not mark any claim accepted.
  if (value.candidates.some((candidate) => candidate.accepted)) codes.push('nonaccept:accepted_present');
  return codes;
}

export function isObProdAcceptanceConsistent(value: ObProdExtraction): boolean {
  return explainObProdAcceptance(value).length === 0;
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
