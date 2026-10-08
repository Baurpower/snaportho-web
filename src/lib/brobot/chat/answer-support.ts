import { createHash } from 'node:crypto';
import { answerClaims } from './anki-claims';

export const ANSWER_SUPPORT_SCHEMA_VERSION = 'brobot-answer-support.v1';

export type AnswerSupportVerification =
  | 'model_reported'
  | 'deterministic_verified'
  | 'model_verified'
  | 'rejected'
  | 'posthoc_verified';

export type BroBotAnswerSupport = {
  answerAnchorId: string;
  answerText: string;
  answerAnchorHash: string;
  claimIds: string[];
  verification: AnswerSupportVerification;
  verificationReason?: string;
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
export const answerAnchorHash = (text: string) =>
  createHash('sha256').update(normalize(text)).digest('hex');

export function buildAnswerAnchors(answer: string) {
  return answerClaims(answer).map((claim) => ({
    id: `${claim.id}:${answerAnchorHash(claim.text).slice(0, 12)}`,
    legacyId: claim.id,
    text: normalize(claim.text),
    hash: answerAnchorHash(claim.text),
  }));
}

function obviousSupportConflict(answerText: string, claimText: string) {
  const numbers = (value: string): string[] =>
    value.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  const negated = (value: string) =>
    /\b(?:not|never|without|no)\b/i.test(value);
  const side = (value: string) =>
    /\bleft\b/i.test(value)
      ? 'left'
      : /\bright\b/i.test(value)
        ? 'right'
        : null;
  const aNumbers = numbers(answerText);
  const cNumbers = numbers(claimText);
  if (
    aNumbers.length &&
    cNumbers.length &&
    aNumbers.some((number) => !cNumbers.includes(number))
  )
    return 'numeric_mismatch';
  if (negated(answerText) !== negated(claimText)) return 'polarity_mismatch';
  if (
    side(answerText) &&
    side(claimText) &&
    side(answerText) !== side(claimText)
  )
    return 'laterality_mismatch';
  return null;
}

export function normalizeAnswerSupport(input: {
  answer: string;
  raw: unknown;
  claims: Array<{ claimId: string; claimText: string }>;
}): BroBotAnswerSupport[] {
  if (!Array.isArray(input.raw)) return [];
  const anchors = buildAnswerAnchors(input.answer);
  const claimById = new Map(
    input.claims.map((claim) => [claim.claimId, claim.claimText]),
  );
  const results: BroBotAnswerSupport[] = [];
  for (const item of input.raw.slice(0, 16)) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const answerText = normalize(String(record.answerText ?? ''));
    const anchor = anchors.find((candidate) => candidate.text === answerText);
    if (!anchor || !Array.isArray(record.claimIds)) continue;
    const ids = [
      ...new Set(
        record.claimIds.filter(
          (id): id is string => typeof id === 'string' && claimById.has(id),
        ),
      ),
    ].slice(0, 4);
    if (!ids.length) continue;
    const conflict = ids
      .map((id) => obviousSupportConflict(answerText, claimById.get(id)!))
      .find(Boolean);
    results.push({
      answerAnchorId: anchor.id,
      answerText,
      answerAnchorHash: anchor.hash,
      claimIds: ids,
      verification: conflict ? 'rejected' : 'deterministic_verified',
      verificationReason: conflict ?? undefined,
    });
  }
  return results;
}

export const verifiedClaimIds = (support: BroBotAnswerSupport[]) => [
  ...new Set(
    support
      .filter((item) => item.verification !== 'rejected')
      .flatMap((item) => item.claimIds),
  ),
];
