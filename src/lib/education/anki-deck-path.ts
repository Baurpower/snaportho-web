/**
 * Use SnapOrtho for stored deck names and product-facing paths.
 * Accept the legacy root when reading immutable release history or old imports.
 */
export const PRODUCT_PARENT_DECK = "SnapOrtho";
export const IMPORT_PARENT_DECK = PRODUCT_PARENT_DECK;
export const LEGACY_IMPORT_PARENT_DECK = "Marty McFlyin's Ortho Deck";

export function toProductDeckPath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed) return trimmed;
  if (trimmed === LEGACY_IMPORT_PARENT_DECK) return PRODUCT_PARENT_DECK;
  const prefix = `${LEGACY_IMPORT_PARENT_DECK}::`;
  if (trimmed.startsWith(prefix)) {
    return `${PRODUCT_PARENT_DECK}::${trimmed.slice(prefix.length)}`;
  }
  return trimmed;
}

export function toImportDeckPath(path: string): string {
  return toProductDeckPath(path);
}
