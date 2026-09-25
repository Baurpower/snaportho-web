const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;

/**
 * Returns only source identifiers, never question content.  Case variants are
 * intentional: older imports did not consistently normalize OBQ/SBQ codes.
 */
export function resolveOrthobulletsIdentityCandidates(input: {
  nativeQuestionId: string;
  aliases?: unknown[];
}) {
  const safe = [input.nativeQuestionId, ...(input.aliases ?? [])]
    .filter((value): value is string => typeof value === 'string' && SAFE_ID.test(value))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(safe.flatMap((value) => [value, value.toUpperCase(), value.toLowerCase()]))];
}

export function safeOrthobulletsTopicId(value: unknown) {
  return typeof value === 'string' && SAFE_ID.test(value) ? value : null;
}
