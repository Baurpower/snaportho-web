import { createHash } from "node:crypto";

export const CLINICAL_CLAIM_CONTRACT_VERSION = "snaportho-clinical-claim.v1" as const;
export const CLINICAL_CLAIM_SCHEMA_VERSION = "snaportho-clinical-claim-schema.v1" as const;

export const CLINICAL_CLAIM_TYPES = [
  "fact",
  "clinical_script",
  "attending_pearl",
  "board_trap",
  "cognitive_trap",
  "common_mistake",
  "red_flag",
  "pitfall",
  "operative_pearl",
  "complication_warning",
  "imaging_point",
  "anatomy_pearl",
  "treatment_indication",
  "diagnostic_interpretation",
  "contraindication",
  "complication",
] as const;

export const CLINICAL_CLAIM_PREDICATES = [
  "preferred_treatment",
  "preferred_reconstruction",
  "indication",
  "contraindication",
  "diagnostic_threshold",
  "diagnostic_interpretation",
  "complication_of",
  "structure_at_risk",
  "classification_grade",
  "imaging_finding",
  "teaches_fact",
] as const;

export const CLINICAL_CLAIM_QUALIFIER_KEYS = [
  "anatomy",
  "age_group",
  "setting",
  "severity",
  "laterality",
  "procedure",
  "contraindication",
] as const;

export const CLINICAL_CLAIM_APPROVAL_METHODS = [
  "unreviewed",
  "machine_consensus",
  "sampled_audit",
  "human_review",
] as const;

export const CLINICAL_CLAIM_LINK_APPROVAL_METHODS = [
  "machine_consensus",
  "sampled_audit",
  "human_review",
] as const;

export const CLINICAL_CLAIM_LINK_REVIEW_STATUSES = [
  "auto_approved",
  "needs_review",
  "approved",
  "rejected",
  "superseded",
] as const;

export const CLINICAL_CLAIM_GAP_CLASSES = [
  "missing_claim",
  "missing_card",
  "weak_card",
  "mapping_gap",
  "source_extraction_gap",
  "retrieval_gap",
] as const;

export const CLINICAL_CLAIM_GAP_OWNERS = [
  "kg",
  "editorial",
  "mapping",
  "extension",
  "ranking",
] as const;

export const QUESTION_CLAIM_PROVIDERS = ["orthobullets", "rock_himalaya"] as const;

export type ClinicalClaimType = (typeof CLINICAL_CLAIM_TYPES)[number];
export type ClinicalClaimPredicate = (typeof CLINICAL_CLAIM_PREDICATES)[number];
export type ClinicalClaimQualifierKey = (typeof CLINICAL_CLAIM_QUALIFIER_KEYS)[number];
export type ClinicalClaimQualifiers = Partial<Record<ClinicalClaimQualifierKey, string>>;
export type ClinicalClaimApprovalMethod = (typeof CLINICAL_CLAIM_APPROVAL_METHODS)[number];
export type ClinicalClaimLinkApprovalMethod = (typeof CLINICAL_CLAIM_LINK_APPROVAL_METHODS)[number];
export type ClinicalClaimLinkReviewStatus = (typeof CLINICAL_CLAIM_LINK_REVIEW_STATUSES)[number];
export type ClinicalClaimGapClass = (typeof CLINICAL_CLAIM_GAP_CLASSES)[number];
export type ClinicalClaimGapOwner = (typeof CLINICAL_CLAIM_GAP_OWNERS)[number];
export type QuestionClaimProvider = (typeof QUESTION_CLAIM_PROVIDERS)[number];

export type ClinicalClaimFingerprintInput = {
  claimType: string;
  primaryEntityId: string;
  predicate: string;
  objectText: string;
  qualifiers?: ClinicalClaimQualifiers | Record<string, string>;
};

export type ClinicalClaimRecordV1 = {
  contractVersion: typeof CLINICAL_CLAIM_CONTRACT_VERSION;
  claimId: string;
  currentVersionId: string | null;
  fingerprintHash: string;
  /**
   * Canonical semantic identity (Pattern A coexistence). Optional so legacy
   * rows and fixtures without semantic backfill keep validating; all new
   * writers must populate it via semanticClaimFingerprintHash.
   */
  semanticFingerprintHash?: string | null;
  semanticIdentityVersion?: string | null;
  claimText: string;
  claimType: ClinicalClaimType;
  predicate: string;
  objectText: string;
  qualifiers: ClinicalClaimQualifiers;
  primaryEntityId: string;
  approvalMethod: ClinicalClaimApprovalMethod;
  algorithmVersion: string;
  isActive: boolean;
};

export type CardClaimLinkV1 = {
  contractVersion: typeof CLINICAL_CLAIM_CONTRACT_VERSION;
  canonicalCardId: string;
  canonicalCardVersionId: string;
  claimId: string;
  claimVersionId: string;
  mappingRole: "teaches";
  confidence: number;
  approvalMethod: ClinicalClaimLinkApprovalMethod;
  reviewStatus: ClinicalClaimLinkReviewStatus;
  algorithmVersion: string;
  evidenceLocator: string;
  evidenceHashes: string[];
  reasonCodes: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
};

export type QuestionClaimLinkV1 = {
  contractVersion: typeof CLINICAL_CLAIM_CONTRACT_VERSION;
  provider: QuestionClaimProvider;
  nativeQuestionId: string;
  externalQuestionId: string | null;
  claimId: string;
  claimVersionId: string;
  mappingRole: "tests_primary" | "tests_secondary";
  confidence: number;
  approvalMethod: ClinicalClaimLinkApprovalMethod;
  reviewStatus: ClinicalClaimLinkReviewStatus;
  algorithmVersion: string;
  evidenceLocator: string;
  sourceFingerprintHash: string | null;
  evidenceHashes: string[];
  reasonCodes: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
};

export type EducationalClaimGapV1 = {
  contractVersion: typeof CLINICAL_CLAIM_CONTRACT_VERSION;
  gapClass: ClinicalClaimGapClass;
  owner: ClinicalClaimGapOwner;
  disposition: "open" | "assigned" | "resolved" | "wontfix" | "duplicate";
  priorityScore: number;
  claimId: string | null;
  claimVersionId: string | null;
  canonicalCardId: string | null;
  provider: QuestionClaimProvider | null;
  nativeQuestionId: string | null;
  algorithmVersion: string;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const ALGORITHM = /^[A-Za-z0-9._:-]{1,80}$/;
const HTML = /<[^>]+>/;
const FORBIDDEN_METADATA_KEYS = new Set([
  "stem", "question", "questiontext", "answer", "answertext", "answerchoices", "choices",
  "correctanswer", "selectedanswer", "explanation", "image", "images", "rawhtml",
  "cardbody", "front", "back",
]);

export function normalizeClinicalClaimText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+/ -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clinicalClaimFingerprintPayload(input: ClinicalClaimFingerprintInput): string {
  const qualifiers = input.qualifiers ?? {};
  const qualifierStr = Object.entries(qualifiers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${normalizeClinicalClaimText(value ?? "")}`)
    .join(";");
  return [
    `type=${normalizeClinicalClaimText(input.claimType)}`,
    `entity=${input.primaryEntityId.toLowerCase()}`,
    `predicate=${normalizeClinicalClaimText(input.predicate)}`,
    `object=${normalizeClinicalClaimText(input.objectText)}`,
    `qualifiers=${qualifierStr}`,
  ].join("\n");
}

export function clinicalClaimFingerprintHash(input: ClinicalClaimFingerprintInput): string {
  return createHash("sha256").update(clinicalClaimFingerprintPayload(input), "utf8").digest("hex");
}

export function containsProtectedEducationalContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsProtectedEducationalContent);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN_METADATA_KEYS.has(key.toLowerCase()) || containsProtectedEducationalContent(nested),
  );
}

export function clinicalClaimQualifiersAreValid(value: unknown): value is ClinicalClaimQualifiers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (containsProtectedEducationalContent(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(([key, nested]) => (
    (CLINICAL_CLAIM_QUALIFIER_KEYS as readonly string[]).includes(key)
    && typeof nested === "string"
    && nested.length <= 80
  ));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function isSafeLocator(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 200 && !HTML.test(value);
}

function isConfidence(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSha256Array(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isSha256);
}

export function isClinicalClaimRecordV1(value: unknown): value is ClinicalClaimRecordV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === CLINICAL_CLAIM_CONTRACT_VERSION
    && isUuid(row.claimId)
    && (row.currentVersionId === null || isUuid(row.currentVersionId))
    && isSha256(row.fingerprintHash)
    && typeof row.claimText === "string" && row.claimText.length >= 1 && row.claimText.length <= 2000
    && (CLINICAL_CLAIM_TYPES as readonly string[]).includes(row.claimType as string)
    && typeof row.predicate === "string" && row.predicate.length <= 80
    && typeof row.objectText === "string" && row.objectText.length <= 200
    && clinicalClaimQualifiersAreValid(row.qualifiers)
    && isUuid(row.primaryEntityId)
    && (CLINICAL_CLAIM_APPROVAL_METHODS as readonly string[]).includes(row.approvalMethod as string)
    && typeof row.algorithmVersion === "string" && ALGORITHM.test(row.algorithmVersion)
    && typeof row.isActive === "boolean"
    && row.fingerprintHash === clinicalClaimFingerprintHash({
      claimType: row.claimType as string,
      primaryEntityId: row.primaryEntityId as string,
      predicate: row.predicate as string,
      objectText: row.objectText as string,
      qualifiers: row.qualifiers as ClinicalClaimQualifiers,
    });
}

export function isCardClaimLinkV1(value: unknown): value is CardClaimLinkV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === CLINICAL_CLAIM_CONTRACT_VERSION
    && isUuid(row.canonicalCardId)
    && isUuid(row.canonicalCardVersionId)
    && isUuid(row.claimId)
    && isUuid(row.claimVersionId)
    && row.mappingRole === "teaches"
    && isConfidence(row.confidence)
    && (CLINICAL_CLAIM_LINK_APPROVAL_METHODS as readonly string[]).includes(row.approvalMethod as string)
    && (CLINICAL_CLAIM_LINK_REVIEW_STATUSES as readonly string[]).includes(row.reviewStatus as string)
    && typeof row.algorithmVersion === "string" && ALGORITHM.test(row.algorithmVersion)
    && isSafeLocator(row.evidenceLocator)
    && isSha256Array(row.evidenceHashes)
    && isStringArray(row.reasonCodes)
    && !!row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    && !containsProtectedEducationalContent(row.metadata)
    && typeof row.isActive === "boolean";
}

export function isQuestionClaimLinkV1(value: unknown): value is QuestionClaimLinkV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  return row.contractVersion === CLINICAL_CLAIM_CONTRACT_VERSION
    && (QUESTION_CLAIM_PROVIDERS as readonly string[]).includes(row.provider as string)
    && typeof row.nativeQuestionId === "string" && SAFE_ID.test(row.nativeQuestionId)
    && (row.externalQuestionId === null || isUuid(row.externalQuestionId))
    && isUuid(row.claimId)
    && isUuid(row.claimVersionId)
    && (row.mappingRole === "tests_primary" || row.mappingRole === "tests_secondary")
    && isConfidence(row.confidence)
    && (CLINICAL_CLAIM_LINK_APPROVAL_METHODS as readonly string[]).includes(row.approvalMethod as string)
    && (CLINICAL_CLAIM_LINK_REVIEW_STATUSES as readonly string[]).includes(row.reviewStatus as string)
    && typeof row.algorithmVersion === "string" && ALGORITHM.test(row.algorithmVersion)
    && isSafeLocator(row.evidenceLocator)
    && (row.sourceFingerprintHash === null || isSha256(row.sourceFingerprintHash))
    && isSha256Array(row.evidenceHashes)
    && isStringArray(row.reasonCodes)
    && !!row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    && !containsProtectedEducationalContent(row.metadata)
    && typeof row.isActive === "boolean";
}

export function isEducationalClaimGapV1(value: unknown): value is EducationalClaimGapV1 {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  const gapClass = row.gapClass as ClinicalClaimGapClass;
  if (!(CLINICAL_CLAIM_GAP_CLASSES as readonly string[]).includes(gapClass)) return false;
  if ((gapClass === "missing_card" || gapClass === "weak_card" || gapClass === "mapping_gap") && row.claimId == null) {
    return false;
  }
  if (gapClass === "weak_card" && row.canonicalCardId == null) return false;
  return row.contractVersion === CLINICAL_CLAIM_CONTRACT_VERSION
    && (CLINICAL_CLAIM_GAP_OWNERS as readonly string[]).includes(row.owner as string)
    && ["open", "assigned", "resolved", "wontfix", "duplicate"].includes(row.disposition as string)
    && Number.isInteger(row.priorityScore) && (row.priorityScore as number) >= 0 && (row.priorityScore as number) <= 100
    && (row.claimId === null || isUuid(row.claimId))
    && (row.claimVersionId === null || isUuid(row.claimVersionId))
    && (row.canonicalCardId === null || isUuid(row.canonicalCardId))
    && (row.provider === null || (QUESTION_CLAIM_PROVIDERS as readonly string[]).includes(row.provider as string))
    && (row.nativeQuestionId === null || (typeof row.nativeQuestionId === "string" && SAFE_ID.test(row.nativeQuestionId)))
    && typeof row.algorithmVersion === "string" && ALGORITHM.test(row.algorithmVersion)
    && isStringArray(row.reasonCodes)
    && !!row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    && !containsProtectedEducationalContent(row.metadata)
    && typeof row.isActive === "boolean";
}

/**
 * @deprecated Legacy v1 structural identity. Two claims sharing this
 * fingerprint are NOT automatically equivalent: the predicate vocabulary is
 * degenerate and object_text is raw cloze-answer text, so clinically distinct
 * propositions collide. Use claimsShareSemanticFingerprint for candidate
 * matching, and never treat legacy equality as equivalence.
 */
export function claimsShareFingerprint(
  left: ClinicalClaimFingerprintInput,
  right: ClinicalClaimFingerprintInput,
): boolean {
  return clinicalClaimFingerprintHash(left) === clinicalClaimFingerprintHash(right);
}

// ---------------------------------------------------------------------------
// Canonical semantic identity (v1).
//
// The semantic fingerprint identifies the PROPOSITION asserted, independent of
// source provenance, entity resolution, extractor, or review state. A card
// claim and an Orthobullets claim asserting the same proposition converge to
// the same fingerprint; clinically distinct propositions stay distinct.
//
// This TypeScript implementation is the shared client-side copy. The
// authoritative server-side copy is
// public.educational_claim_semantic_fingerprint_hash in the
// claim_semantic_identity migration. Both implement the identical
// normalization order; claim-semantic-identity.test.ts pins exact payload
// strings, and the migration header carries the same worked examples.
// ---------------------------------------------------------------------------

export const SEMANTIC_CLAIM_IDENTITY_VERSION = "v1" as const;

export type SemanticClaimFingerprintInput = {
  claimText: string;
  claimType: string;
  qualifiers?: ClinicalClaimQualifiers | Record<string, string>;
};

const SEMANTIC_HTML_ENTITIES: Array<[RegExp, string]> = [
  [/&nbsp;/g, " "],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, "\""],
  [/&#39;/g, "'"],
  [/&apos;/g, "'"],
  [/&deg;/g, "deg"],
  [/&ge;/g, ">="],
  [/&le;/g, "<="],
  [/&plusmn;/g, "+/-"],
  [/&times;/g, "x"],
  // &amp; decodes LAST so "&amp;lt;" yields "&lt;" (single decode), never "<".
  [/&amp;/g, "&"],
];

const SEMANTIC_UNICODE_MAP: Array<[RegExp, string]> = [
  // Explicit escapes (never literal invisible characters) so SQL and TS stay
  // visibly in sync: U+00A0 nbsp, U+2013/2014 dashes, U+2212 minus,
  // U+2018/2019 quotes, U+201C/201D dquotes, U+2265/2264, U+00D7, U+00B0, U+00B1.
  [/\u00a0/g, " "],
  [/[\u2013\u2014\u2212]/g, "-"],
  [/[\u2018\u2019]/g, "'"],
  [/[\u201c\u201d]/g, "\""],
  [/\u2265/g, ">="],
  [/\u2264/g, "<="],
  [/\u00d7/g, "x"],
  [/\u00b0/g, "deg"],
  [/\u00b1/g, "+/-"],
];

// Known inline-HTML tags only: a generic <[^>]+> strip would eat clinical
// comparators such as "<5 mm and >2 mm".
const SEMANTIC_HTML_TAG =
  /<\/?(b|i|u|em|strong|sub|sup|br|p|div|span|table|tr|td|th|ul|ol|li)\b[^>]*>/g;

export function normalizeSemanticClaimText(value: string): string {
  let out = value;
  for (const [pattern, replacement] of SEMANTIC_HTML_ENTITIES) out = out.replace(pattern, replacement);
  for (const [pattern, replacement] of SEMANTIC_UNICODE_MAP) out = out.replace(pattern, replacement);
  out = out.toLowerCase();
  out = out.replace(/\{\{c\d+::/g, "").replace(/}}/g, "");
  out = out.replace(SEMANTIC_HTML_TAG, "");
  // Comparators, decimals, percent, and units survive: v1 dropped < > . %
  // from normalized text, which is exactly how thresholds collided.
  out = out.replace(/[^a-z0-9 +\-/.,<>=%']/g, " ");
  // Trim again after the trailing-dot strip: "knee ." must not keep a
  // trailing space (SQL twin applies the identical final btrim).
  out = out.replace(/\s+/g, " ").trim().replace(/\.$/, "").trim();
  return out;
}

export function semanticClaimFingerprintPayload(input: SemanticClaimFingerprintInput): string {
  const qualifiers = input.qualifiers ?? {};
  const qualifierStr = Object.entries(qualifiers)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${normalizeSemanticClaimText(value ?? "")}`)
    .join(";");
  return [
    `semantic=${SEMANTIC_CLAIM_IDENTITY_VERSION}`,
    `assertion=${normalizeSemanticClaimText(input.claimText)}`,
    `type=${normalizeSemanticClaimText(input.claimType)}`,
    `qualifiers=${qualifierStr}`,
  ].join("\n");
}

export function semanticClaimFingerprintHash(input: SemanticClaimFingerprintInput): string {
  return createHash("sha256").update(semanticClaimFingerprintPayload(input), "utf8").digest("hex");
}

export function claimsShareSemanticFingerprint(
  left: SemanticClaimFingerprintInput,
  right: SemanticClaimFingerprintInput,
): boolean {
  return semanticClaimFingerprintHash(left) === semanticClaimFingerprintHash(right);
}

const SEMANTIC_SHA256 = /^[0-9a-f]{64}$/;

/** True when the record carries a well-formed v1 semantic fingerprint. */
export function hasSemanticFingerprint(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    (row.semanticIdentityVersion === undefined || row.semanticIdentityVersion === SEMANTIC_CLAIM_IDENTITY_VERSION)
    && typeof row.semanticFingerprintHash === "string"
    && SEMANTIC_SHA256.test(row.semanticFingerprintHash)
  );
}

/** True when the record's stored semantic fingerprint matches its content. */
export function semanticFingerprintMatchesContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (typeof row.claimText !== "string" || typeof row.claimType !== "string") return false;
  if (row.semanticIdentityVersion !== undefined && row.semanticIdentityVersion !== SEMANTIC_CLAIM_IDENTITY_VERSION) {
    return false;
  }
  const qualifiers = (row.qualifiers ?? {}) as ClinicalClaimQualifiers;
  return row.semanticFingerprintHash === semanticClaimFingerprintHash({
    claimText: row.claimText,
    claimType: row.claimType,
    qualifiers,
  });
}
