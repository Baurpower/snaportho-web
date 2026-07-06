/**
 * Deterministic evidence ID assignment — same inputs produce same IDs across runs.
 */

export function normalizeEvidenceKey(parts: string[]): string {
  return parts
    .map((p) => p.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean)
    .join("::");
}

export function stableEvidenceId(
  sourceType: string,
  sourceId: string,
  extractionMethod: string,
  suffix = ""
): string {
  const key = normalizeEvidenceKey([sourceType, sourceId, extractionMethod, suffix]);
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33) ^ key.charCodeAt(i);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  const typeSlug = sourceType.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 24);
  return `ev-${typeSlug}-${hex}`;
}