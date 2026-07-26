/**
 * Map import-provenance deck roots to the product-facing SnapOrtho parent deck.
 * Source `anki_decks.full_name` may still say "Marty McFlyin's Ortho Deck"; user-facing
 * packages and sync manifests use SnapOrtho.
 */
export const IMPORT_PARENT_DECK = "Marty McFlyin's Ortho Deck";
export const PRODUCT_PARENT_DECK = "SnapOrtho";

export function toProductDeckPath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed) return trimmed;
  if (trimmed === IMPORT_PARENT_DECK) return PRODUCT_PARENT_DECK;
  const prefix = `${IMPORT_PARENT_DECK}::`;
  if (trimmed.startsWith(prefix)) {
    return `${PRODUCT_PARENT_DECK}::${trimmed.slice(prefix.length)}`;
  }
  return trimmed;
}

export function toImportDeckPath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed) return trimmed;
  if (trimmed === PRODUCT_PARENT_DECK) return IMPORT_PARENT_DECK;
  const prefix = `${PRODUCT_PARENT_DECK}::`;
  if (trimmed.startsWith(prefix)) {
    return `${IMPORT_PARENT_DECK}::${trimmed.slice(prefix.length)}`;
  }
  return trimmed;
}
