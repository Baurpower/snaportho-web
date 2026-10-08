export const ANKI_LINK_CODE_LENGTH = 10;

export function normalizeAnkiLinkCode(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidAnkiLinkCode(value: string): boolean {
  return /^[0-9A-F]{10}$/.test(normalizeAnkiLinkCode(value));
}

export function formatAnkiLinkCode(value: string): string {
  const normalized = normalizeAnkiLinkCode(value);
  return normalized.length > 5
    ? `${normalized.slice(0, 5)}-${normalized.slice(5)}`
    : normalized;
}
