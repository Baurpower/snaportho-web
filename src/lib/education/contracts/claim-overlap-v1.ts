import {
  CLINICAL_CLAIM_CONTRACT_VERSION,
  CLINICAL_CLAIM_GAP_CLASSES,
  CLINICAL_CLAIM_TYPES,
  QUESTION_CLAIM_PROVIDERS,
  clinicalClaimFingerprintHash,
  clinicalClaimQualifiersAreValid,
  containsProtectedEducationalContent,
  type ClinicalClaimGapClass,
  type ClinicalClaimQualifiers,
  type ClinicalClaimType,
  type QuestionClaimProvider,
} from "./clinical-claim-v1";

export const CLAIM_OVERLAP_ALGORITHM = "claim-overlap.v1" as const;
export const CLAIM_OVERLAP_GOLD_CONTRACT = "snaportho-claim-overlap-gold.v1" as const;

/** Frozen with this algorithm version. Raising recall by lowering tau is a new algorithm version. */
export const CLAIM_OVERLAP_TAU = 0.9;
export const CLAIM_OVERLAP_DELTA = 0.05;
export const CLAIM_OVERLAP_MAX_CARDS = 3;
export const CLAIM_OVERLAP_GOLD_SIZE = 50;

export const CLAIM_OVERLAP_SAFETY_HOLD_TYPES = [
  "contraindication",
  "complication",
  "red_flag",
  "imaging_point",
] as const;

export const CLAIM_OVERLAP_GATES = {
  precisionAt1: 0.9,
  precisionAt3: 0.95,
  incorrectCardRate: 0.02,
  siblingDuplicateRate: 0.03,
} as const;

export const GOLD_ITEM_FORMATS = [
  "text",
  "image",
  "algorithm",
  "contraindication",
  "complication",
  "no_card",
] as const;

export const GOLD_DISPOSITIONS = ["serve", "abstain", "no_card"] as const;

export type GoldItemFormat = (typeof GOLD_ITEM_FORMATS)[number];
export type GoldDisposition = (typeof GOLD_DISPOSITIONS)[number];

export type ClaimOverlapQuery = {
  provider: QuestionClaimProvider;
  nativeQuestionId: string;
  sourceFingerprintHash: string;
  claimType: ClinicalClaimType;
  predicate: string;
  objectText: string;
  qualifiers: ClinicalClaimQualifiers;
  primaryEntityId: string;
  fingerprintHash: string;
  questionFormat?: GoldItemFormat;
};

export type GoldItemExpected = {
  disposition: GoldDisposition;
  primaryCardId: string | null;
  allowedCardIds: string[];
  gapClass: ClinicalClaimGapClass | null;
};

export type ClaimOverlapGoldItem = {
  contractVersion: typeof CLAIM_OVERLAP_GOLD_CONTRACT;
  itemId: string;
  provider: QuestionClaimProvider;
  nativeQuestionId: string;
  sourceFingerprintHash: string;
  specialty: string;
  format: GoldItemFormat;
  testedClaim: {
    claimText: string;
    claimType: ClinicalClaimType;
    predicate: string;
    objectText: string;
    qualifiers: ClinicalClaimQualifiers;
    primaryEntityId: string;
    fingerprintHash: string;
  };
  expected: GoldItemExpected;
  rationale: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;

export function isSafetyHoldClaim(input: {
  claimType: string;
  qualifiers: ClinicalClaimQualifiers;
  format?: GoldItemFormat;
}): boolean {
  if ((CLAIM_OVERLAP_SAFETY_HOLD_TYPES as readonly string[]).includes(input.claimType)) return true;
  if (input.qualifiers.age_group === "pediatric") return true;
  if (input.format === "algorithm") return true;
  return false;
}

export function isClaimOverlapGoldItem(value: unknown): value is ClaimOverlapGoldItem {
  if (!value || typeof value !== "object" || containsProtectedEducationalContent(value)) return false;
  const row = value as Record<string, unknown>;
  const claim = row.testedClaim as Record<string, unknown> | undefined;
  const expected = row.expected as Record<string, unknown> | undefined;
  if (!claim || !expected) return false;
  if (row.contractVersion !== CLAIM_OVERLAP_GOLD_CONTRACT) return false;
  if (typeof row.itemId !== "string" || !SAFE_ID.test(row.itemId)) return false;
  if (!(QUESTION_CLAIM_PROVIDERS as readonly string[]).includes(row.provider as string)) return false;
  if (typeof row.nativeQuestionId !== "string" || !SAFE_ID.test(row.nativeQuestionId)) return false;
  if (typeof row.sourceFingerprintHash !== "string" || !SHA256.test(row.sourceFingerprintHash)) return false;
  if (typeof row.specialty !== "string" || row.specialty.length < 2 || row.specialty.length > 80) return false;
  if (!(GOLD_ITEM_FORMATS as readonly string[]).includes(row.format as string)) return false;
  if (typeof row.rationale !== "string" || row.rationale.length < 8 || row.rationale.length > 400) return false;
  if (typeof claim.claimText !== "string" || claim.claimText.length < 1 || claim.claimText.length > 500) return false;
  if (!(CLINICAL_CLAIM_TYPES as readonly string[]).includes(claim.claimType as string)) return false;
  if (typeof claim.predicate !== "string" || claim.predicate.length < 1 || claim.predicate.length > 80) return false;
  if (typeof claim.objectText !== "string" || claim.objectText.length < 1 || claim.objectText.length > 200) return false;
  if (!clinicalClaimQualifiersAreValid(claim.qualifiers)) return false;
  if (typeof claim.primaryEntityId !== "string" || !UUID.test(claim.primaryEntityId)) return false;
  if (typeof claim.fingerprintHash !== "string" || !SHA256.test(claim.fingerprintHash)) return false;
  if (claim.fingerprintHash !== clinicalClaimFingerprintHash({
    claimType: claim.claimType as string,
    primaryEntityId: claim.primaryEntityId as string,
    predicate: claim.predicate as string,
    objectText: claim.objectText as string,
    qualifiers: claim.qualifiers as ClinicalClaimQualifiers,
  })) return false;
  if (!(GOLD_DISPOSITIONS as readonly string[]).includes(expected.disposition as string)) return false;
  if (expected.primaryCardId !== null && (typeof expected.primaryCardId !== "string" || !UUID.test(expected.primaryCardId))) {
    return false;
  }
  if (!Array.isArray(expected.allowedCardIds) || !expected.allowedCardIds.every((id) => typeof id === "string" && UUID.test(id))) {
    return false;
  }
  if (expected.gapClass !== null && !(CLINICAL_CLAIM_GAP_CLASSES as readonly string[]).includes(expected.gapClass as string)) {
    return false;
  }
  if (expected.disposition === "serve") {
    if (typeof expected.primaryCardId !== "string") return false;
    if (!expected.allowedCardIds.includes(expected.primaryCardId)) return false;
  } else if (expected.primaryCardId !== null || expected.allowedCardIds.length > 0) {
    return false;
  }
  if (expected.disposition === "no_card" && expected.gapClass !== "missing_card") return false;
  if (row.format === "no_card" && expected.disposition !== "no_card") return false;
  return true;
}

export function goldSetMixErrors(items: ClaimOverlapGoldItem[]): string[] {
  const errors: string[] = [];
  if (items.length !== CLAIM_OVERLAP_GOLD_SIZE) errors.push(`expected_${CLAIM_OVERLAP_GOLD_SIZE}_items`);
  const providers = Object.fromEntries(QUESTION_CLAIM_PROVIDERS.map((provider) => [
    provider,
    items.filter((item) => item.provider === provider).length,
  ]));
  if (providers.orthobullets !== 25) errors.push("expected_25_orthobullets");
  if (providers.rock_himalaya !== 25) errors.push("expected_25_rock_himalaya");
  for (const format of GOLD_ITEM_FORMATS) {
    if (!items.some((item) => item.format === format)) errors.push(`missing_format_${format}`);
  }
  if (items.filter((item) => item.expected.disposition === "no_card").length < 3) {
    errors.push("expected_at_least_3_no_card");
  }
  const ids = items.map((item) => item.itemId);
  if (new Set(ids).size !== ids.length) errors.push("duplicate_item_id");
  const native = items.map((item) => `${item.provider}:${item.nativeQuestionId}`);
  if (new Set(native).size !== native.length) errors.push("duplicate_native_id");
  if (items.some((item) => containsProtectedEducationalContent(item))) errors.push("protected_content");
  if (items.some((item) => !isClaimOverlapGoldItem(item))) errors.push("invalid_gold_item");
  return errors;
}

export function queryFromGoldItem(item: ClaimOverlapGoldItem): ClaimOverlapQuery {
  return {
    provider: item.provider,
    nativeQuestionId: item.nativeQuestionId,
    sourceFingerprintHash: item.sourceFingerprintHash,
    claimType: item.testedClaim.claimType,
    predicate: item.testedClaim.predicate,
    objectText: item.testedClaim.objectText,
    qualifiers: item.testedClaim.qualifiers,
    primaryEntityId: item.testedClaim.primaryEntityId,
    fingerprintHash: item.testedClaim.fingerprintHash,
    questionFormat: item.format,
  };
}

export { CLINICAL_CLAIM_CONTRACT_VERSION };
