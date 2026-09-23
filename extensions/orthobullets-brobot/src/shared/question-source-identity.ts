// Provider-neutral question identity for Orthobullets and ROCK/Himalaya.
//
// The durable key is the source item id. Attempt ids stay on the attempt.
// The fingerprint hashes stem and choice text so a content change is drift,
// not a new question. This object is safe to persist later: it carries no
// stem, choices, explanation, or image fields.

export const QUESTION_SOURCE_IDENTITY_CONTRACT = 'snaportho-question-source-identity.v1' as const;

export const QUESTION_SOURCE_PROVIDERS = ['orthobullets', 'rock_himalaya'] as const;

export const STABLE_NATIVE_ID_CAPTURE_MIN = 0.99;
export const REVIEW_OUTCOME_CAPTURE_MIN = 0.95;

export type QuestionSourceProvider = (typeof QUESTION_SOURCE_PROVIDERS)[number];
export type QuestionReviewCaptureState = 'answered_review' | 'not_reviewable';
export type QuestionIdentityStatus = 'stable' | 'missing_native_id' | 'attempt_id_only';

export type QuestionSourceIdentityV1 = {
  contractVersion: typeof QUESTION_SOURCE_IDENTITY_CONTRACT;
  provider: QuestionSourceProvider;
  nativeQuestionId: string | null;
  attemptId: string | null;
  sourceFingerprintHash: string;
  reviewState: QuestionReviewCaptureState;
  correct: boolean | null;
  identityStatus: QuestionIdentityStatus;
  warnings: string[];
};

export type QuestionSourceIdentityInput = {
  provider: QuestionSourceProvider;
  /** Results and overview pages are not a single question. */
  pageRole?: 'question' | 'results';
  definitionId?: string | number | null;
  attemptId?: string | number | null;
  stem?: string | null;
  choices?: ReadonlyArray<{ text?: string | null }>;
  reviewVisible?: boolean;
  correct?: boolean | null;
};

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const WARNING_CODE = /^[a-z0-9_]{1,80}$/;
const FORBIDDEN_KEYS = new Set([
  'stem', 'question', 'questiontext', 'answer', 'answertext', 'answerchoices', 'choices',
  'correctanswer', 'selectedanswer', 'explanation', 'image', 'images', 'rawhtml',
  'cardbody', 'front', 'back',
]);

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

export function sha256Hex(message: string): string {
  const data = new TextEncoder().encode(message);
  const min = data.length + 1 + 8;
  const total = min % 64 === 0 ? min : min + (64 - (min % 64));
  const bytes = new Uint8Array(total);
  bytes.set(data);
  bytes[data.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bitLength = data.length * 8;
  view.setUint32(total - 8, Math.floor(bitLength / 2 ** 32));
  view.setUint32(total - 4, bitLength >>> 0);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) w[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotr(w[index - 15], 7) ^ rotr(w[index - 15], 18) ^ (w[index - 15] >>> 3);
      const s1 = rotr(w[index - 2], 17) ^ rotr(w[index - 2], 19) ^ (w[index - 2] >>> 10);
      w[index] = (w[index - 16] + s0 + w[index - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index] + w[index]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((value) => value.toString(16).padStart(8, '0')).join('');
}

export function normalizeSourceText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeOrthobulletsNativeId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  if (/\/qbank\/testscore\b/i.test(text) && !/[?&](?:questionId|question_id|qid)=/i.test(text)) return null;
  const fromUrl = text.match(/[?&](?:questionId|question_id|qid)=([A-Za-z0-9.-]+)/i)?.[1];
  const source = (fromUrl ?? text).trim();
  const code = source.match(/\b((?:OBQ|SBQ)[A-Z0-9.-]+)\b/i)?.[1];
  if (code && SAFE_ID.test(code)) return code.toUpperCase();
  const labeled = source.match(/\bQID\s*([0-9]{1,12})\b/i)?.[1];
  if (labeled) return labeled;
  if (/^[0-9]{1,12}$/.test(source)) return source;
  return null;
}

export function normalizeHimalayaDefinitionId(raw: string | number | null | undefined): string | null {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw <= 0) return null;
    const text = String(raw);
    return SAFE_ID.test(text) ? text : null;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text || text.length > 200) return null;
  if (/^himalaya:/i.test(text) || /^https?:/i.test(text)) return null;
  if (SHA256.test(text)) return null;
  if (!SAFE_ID.test(text)) return null;
  if (/^[0-9]+$/.test(text)) return text.replace(/^0+/, '') || null;
  return text;
}

export function sourceFingerprintHash(input: {
  provider: QuestionSourceProvider;
  nativeQuestionId?: string | null;
  stem?: string | null;
  choices?: ReadonlyArray<{ text?: string | null }>;
}): string {
  const choices = (input.choices ?? [])
    .map((choice) => normalizeSourceText(choice.text))
    .filter(Boolean)
    .sort();
  const payload = [
    `provider=${input.provider}`,
    `native=${input.nativeQuestionId ?? ''}`,
    `stem=${normalizeSourceText(input.stem)}`,
    `choices=${choices.join('|')}`,
  ].join('\n');
  return sha256Hex(payload);
}

function asAttemptId(raw: string | number | null | undefined): string | null {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw <= 0) return null;
    const text = String(raw);
    return SAFE_ID.test(text) ? text : null;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  return SAFE_ID.test(text) ? text : null;
}

function uniqueWarnings(warnings: string[]): string[] {
  return [...new Set(warnings.filter((warning) => WARNING_CODE.test(warning)))].sort();
}

export function buildQuestionSourceIdentity(input: QuestionSourceIdentityInput): QuestionSourceIdentityV1 {
  const attemptId = asAttemptId(input.attemptId);
  const warnings: string[] = [];
  let nativeQuestionId: string | null = null;

  if (input.pageRole === 'results') {
    warnings.push('results_page_not_a_question');
  } else if (input.provider === 'orthobullets') {
    nativeQuestionId = normalizeOrthobulletsNativeId(
      input.definitionId == null ? null : String(input.definitionId),
    );
  } else {
    nativeQuestionId = normalizeHimalayaDefinitionId(input.definitionId);
    if (nativeQuestionId && attemptId && nativeQuestionId === attemptId) {
      nativeQuestionId = null;
      warnings.push('attempt_id_is_not_native_key');
    }
  }

  let identityStatus: QuestionIdentityStatus;
  if (nativeQuestionId) {
    identityStatus = 'stable';
  } else if (input.provider === 'rock_himalaya' && attemptId && input.pageRole !== 'results') {
    identityStatus = 'attempt_id_only';
    warnings.push('attempt_id_is_not_native_key');
  } else {
    identityStatus = 'missing_native_id';
    if (input.pageRole !== 'results') warnings.push('native_question_id_missing');
  }

  const reviewVisible = input.pageRole !== 'results' && input.reviewVisible === true;
  let reviewState: QuestionReviewCaptureState = 'not_reviewable';
  let correct: boolean | null = null;
  if (!reviewVisible) {
    if (input.correct === true || input.correct === false) warnings.push('outcome_withheld_until_review');
  } else {
    reviewState = 'answered_review';
    if (input.correct === true || input.correct === false) correct = input.correct;
    else warnings.push('review_outcome_missing');
  }

  return {
    contractVersion: QUESTION_SOURCE_IDENTITY_CONTRACT,
    provider: input.provider,
    nativeQuestionId,
    attemptId,
    sourceFingerprintHash: sourceFingerprintHash({
      provider: input.provider,
      nativeQuestionId,
      stem: input.stem,
      choices: input.choices,
    }),
    reviewState,
    correct,
    identityStatus,
    warnings: uniqueWarnings(warnings),
  };
}

export type HimalayaDefinitionLookup = {
  questionAttemptId: number;
  questionId?: number | null;
  questionResults?: ReadonlyArray<{ questionAttemptId?: number; questionId?: number }>;
  openModal?: { questionAttemptId?: number | null; questionId?: number | null } | null;
};

/** Join a te6 attempt to the definition id. Never returns the attempt id. */
export function resolveHimalayaDefinitionId(input: HimalayaDefinitionLookup): string | null {
  const attempt = String(input.questionAttemptId);
  const joined = input.questionResults?.find((row) => row.questionAttemptId === input.questionAttemptId)?.questionId;
  const modal = input.openModal?.questionAttemptId === input.questionAttemptId ? input.openModal.questionId : null;
  for (const candidate of [input.questionId, joined, modal]) {
    const normalized = normalizeHimalayaDefinitionId(candidate);
    if (normalized && normalized !== attempt) return normalized;
  }
  return null;
}

export function containsProtectedIdentityContent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsProtectedIdentityContent);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN_KEYS.has(key.toLowerCase()) || containsProtectedIdentityContent(nested),
  );
}

export function isQuestionSourceIdentityV1(value: unknown): value is QuestionSourceIdentityV1 {
  if (!value || typeof value !== 'object' || containsProtectedIdentityContent(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.contractVersion !== QUESTION_SOURCE_IDENTITY_CONTRACT) return false;
  if (!(QUESTION_SOURCE_PROVIDERS as readonly string[]).includes(row.provider as string)) return false;
  if (!(row.nativeQuestionId === null || (typeof row.nativeQuestionId === 'string' && SAFE_ID.test(row.nativeQuestionId)))) return false;
  if (!(row.attemptId === null || (typeof row.attemptId === 'string' && SAFE_ID.test(row.attemptId)))) return false;
  if (typeof row.sourceFingerprintHash !== 'string' || !SHA256.test(row.sourceFingerprintHash)) return false;
  if (row.reviewState !== 'answered_review' && row.reviewState !== 'not_reviewable') return false;
  if (!(row.correct === null || typeof row.correct === 'boolean')) return false;
  if (row.identityStatus !== 'stable' && row.identityStatus !== 'missing_native_id' && row.identityStatus !== 'attempt_id_only') return false;
  if (!Array.isArray(row.warnings) || row.warnings.some((warning) => typeof warning !== 'string' || !WARNING_CODE.test(warning))) return false;
  if (row.identityStatus === 'stable' && !row.nativeQuestionId) return false;
  if (row.identityStatus !== 'stable' && row.nativeQuestionId) return false;
  if (row.identityStatus === 'attempt_id_only' && !row.attemptId) return false;
  if (row.reviewState === 'not_reviewable' && row.correct !== null) return false;
  if (
    row.provider === 'rock_himalaya'
    && row.nativeQuestionId
    && row.attemptId
    && row.nativeQuestionId === row.attemptId
  ) return false;
  return true;
}

export type IdentityCaptureReport = {
  stableEligible: number;
  stableCaptured: number;
  stableRate: number;
  reviewEligible: number;
  reviewCaptured: number;
  reviewRate: number;
  failures: string[];
};

function rate(captured: number, eligible: number): number {
  return eligible === 0 ? 0 : captured / eligible;
}

/**
 * Sanitized identity cases used as the CI capture gate.
 * Stems are original and stay inside this function; the report has ids only.
 */
export function evaluateSanitizedIdentityCapture(): IdentityCaptureReport {
  const failures: string[] = [];
  let stableEligible = 0;
  let stableCaptured = 0;
  let reviewEligible = 0;
  let reviewCaptured = 0;

  const expectStable = (label: string, identity: QuestionSourceIdentityV1, nativeQuestionId: string) => {
    stableEligible += 1;
    if (identity.identityStatus === 'stable' && identity.nativeQuestionId === nativeQuestionId && isQuestionSourceIdentityV1(identity)) {
      stableCaptured += 1;
    } else {
      failures.push(`${label}: expected stable ${nativeQuestionId}, got ${identity.identityStatus} ${identity.nativeQuestionId}`);
    }
  };
  const expectOutcome = (label: string, identity: QuestionSourceIdentityV1, correct: boolean) => {
    reviewEligible += 1;
    if (identity.reviewState === 'answered_review' && identity.correct === correct) reviewCaptured += 1;
    else failures.push(`${label}: expected review correct=${correct}, got ${identity.reviewState} ${identity.correct}`);
  };

  for (let index = 0; index < 40; index += 1) {
    const qid = String(1000 + index);
    const stem = `Synthetic orthobullets stem ${index} about a sanitized finding.`;
    const choices = [{ text: 'Synthetic choice alpha' }, { text: 'Synthetic choice beta' }];
    const correct = index % 2 === 0;
    const identity = buildQuestionSourceIdentity({
      provider: 'orthobullets',
      definitionId: qid,
      stem,
      choices,
      reviewVisible: true,
      correct,
    });
    expectStable(`ob-${qid}`, identity, qid);
    expectOutcome(`ob-${qid}`, identity, correct);
  }

  for (let index = 0; index < 40; index += 1) {
    const definitionId = 800000 + index;
    const attemptId = 590000000 + index;
    const stem = `Synthetic himalaya stem ${index} about a sanitized decision.`;
    const choices = [{ text: 'Synthetic option one' }, { text: 'Synthetic option two' }];
    const correct = index % 2 === 1;
    const resolved = resolveHimalayaDefinitionId({
      questionAttemptId: attemptId,
      questionResults: [{ questionAttemptId: attemptId, questionId: definitionId }],
    });
    const identity = buildQuestionSourceIdentity({
      provider: 'rock_himalaya',
      definitionId: resolved,
      attemptId,
      stem,
      choices,
      reviewVisible: true,
      correct,
    });
    expectStable(`himalaya-${definitionId}`, identity, String(definitionId));
    expectOutcome(`himalaya-${definitionId}`, identity, correct);
    if (identity.attemptId === identity.nativeQuestionId) {
      failures.push(`himalaya-${definitionId}: attempt id leaked into the native key`);
    }
    const otherAttempt = buildQuestionSourceIdentity({
      provider: 'rock_himalaya',
      definitionId: resolved,
      attemptId: attemptId + 50_000,
      stem,
      choices,
      reviewVisible: true,
      correct,
    });
    if (otherAttempt.sourceFingerprintHash !== identity.sourceFingerprintHash) {
      failures.push(`himalaya-${definitionId}: fingerprint changed across attempts`);
    }
  }

  const missing = buildQuestionSourceIdentity({
    provider: 'orthobullets',
    stem: 'Synthetic stem with no qid.',
    choices: [{ text: 'One' }],
  });
  if (missing.identityStatus !== 'missing_native_id' || missing.nativeQuestionId !== null) {
    failures.push('missing orthobullets qid was treated as stable');
  }

  const attemptOnly = buildQuestionSourceIdentity({
    provider: 'rock_himalaya',
    definitionId: 590424518,
    attemptId: 590424518,
    stem: 'Synthetic stem whose only id is the attempt.',
    choices: [{ text: 'One' }],
    reviewVisible: false,
    correct: false,
  });
  if (attemptOnly.identityStatus !== 'attempt_id_only' || attemptOnly.nativeQuestionId !== null || attemptOnly.correct !== null) {
    failures.push('attempt id was promoted to the native key or leaked an outcome');
  }

  const withheld = buildQuestionSourceIdentity({
    provider: 'rock_himalaya',
    definitionId: 4242,
    attemptId: 11,
    stem: 'Synthetic in-progress stem.',
    choices: [{ text: 'Hidden' }],
    reviewVisible: false,
    correct: true,
  });
  if (withheld.reviewState !== 'not_reviewable' || withheld.correct !== null) {
    failures.push('withheld review still published an outcome');
  }

  const results = buildQuestionSourceIdentity({
    provider: 'orthobullets',
    pageRole: 'results',
    definitionId: 'OBQ13-14',
    stem: 'This page is a score table, not a question.',
  });
  if (results.nativeQuestionId !== null || results.identityStatus !== 'missing_native_id') {
    failures.push('results page was treated as a question');
  }

  const stableRate = rate(stableCaptured, stableEligible);
  const reviewRate = rate(reviewCaptured, reviewEligible);
  if (stableRate < STABLE_NATIVE_ID_CAPTURE_MIN) {
    failures.push(`stable id capture ${stableRate} is under ${STABLE_NATIVE_ID_CAPTURE_MIN}`);
  }
  if (reviewRate < REVIEW_OUTCOME_CAPTURE_MIN) {
    failures.push(`review outcome capture ${reviewRate} is under ${REVIEW_OUTCOME_CAPTURE_MIN}`);
  }

  return {
    stableEligible,
    stableCaptured,
    stableRate,
    reviewEligible,
    reviewCaptured,
    reviewRate,
    failures,
  };
}
