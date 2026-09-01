export type BootstrapTaggedCard = { noteGuid: string; centralTags: string[] };

/** Overlay the current published note-centric tags onto first-install cards. */
export function overlayPublishedGovernedTags<T extends BootstrapTaggedCard>(
  cards: T[],
  governedTagsByGuid: ReadonlyMap<string, readonly string[]>,
): T[] {
  return cards.map((card) => {
    const published = governedTagsByGuid.get(card.noteGuid);
    return published
      ? { ...card, centralTags: [...new Set(published)].sort() }
      : card;
  });
}
