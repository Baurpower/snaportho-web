# Supabase Anki cleanup audit — 2026-09-26

Project: `snaportho` (`geznczcokbgybsseipjg`). Live database inspection and local application source review. No database writes performed. This audit covers Anki import, release, mapping, and related graph data; it is not a complete security or storage audit.

## Findings

- One completed import batch: `SnapOrtho v0.apkg`, ID `4bc171ba-2264-4805-918c-762b5b5d19c6`.
- 5,095 canonical cards, all active and marked imported. Exactly 5,095 canonical versions across 5,095 cards: no evidence of duplicate canonical version accumulation.
- Current published source deck: `0.3.1-cloze-media`, ID `7764b632-5622-4f1b-959d-1874908fc46d`, with 3,670 included cards.
- Current published sync release: `0.0.9`, ID `f5312a8e-c51b-4fa7-b3f6-f0fb3d26463e`, with 3,670 expected notes/cards. All 3,670 current canonical cards match current sync note GUIDs.
- 1,425 active canonical cards are outside the current source release. Their only release memberships are in draft `0.1.0-metadata-shadow` (`a2949ed3-f974-4627-b3fd-b8249fa20ddb`). These are cleanup candidates, not proven accidental content.
- These extra cards have 29 active approved canonical entity links and 70 active automatic knowledge links. They reference 1,169 distinct imported notes; 414 extra cards share notes/GUIDs with current cards. Never delete notes merely because an excluded card references them.

## Candidate branches

| Imported branch | Cards outside current release |
| --- | ---: |
| Netter's Concise Orthopaedic Anatomy | 1,287 |
| OrthoBullets | 124 |
| Pocket Pimped | 11 |
| Hip and Knee Book | 2 |
| AAOS Res Study | 1 |

The exact card IDs and active link counts are in `candidate-cards.json`; `candidate-cards.sql` reproduces the read-only inventory against the pinned source release.

## References that prevent a blind purge

The candidate cards also have 860 mapping candidates, 794 metadata assertions, 1,425 quality reviews, 1,460 metadata pipeline stage results, and 1,108 rendered tag manifest card references. Counts include historical/inactive records where applicable. No references were found in editor workspace proposals, KG improvement suggestions, card claim backfill items, card claim links, training level links, or claim gaps.

The metadata shadow draft has six pipeline runs, four metadata releases, and six rendered tag manifests. A draft label does not prove it is unused. Current sync metadata may derive from those records; that lineage must be checked before pruning them.

Foreign keys both restrict deletion and cascade deletion of related records. In particular, deleting canonical cards can cascade into mappings, quality reviews, and versions, while release and metadata references can block deletion. Do not use cascading deletion to bypass those dependencies.

## History to retain

There are five source deck releases: three published (including the old pilot and style release) and two drafts (metadata shadow and `0.3.2-cloze-media`). The Anki page selects the newest published source release. There are ten sync releases: eight superseded, one published, and one draft (`0.1.0`, created September 5).

`src/app/api/anki/deck/v2/updates/route.ts` explicitly loads published and superseded release lineage and replays its delta operations. Removing superseded releases or their operations can break updates for installed clients. Historical sync rows are intentional under the current implementation.

The source deck name remains Marty McFlyin in import provenance by design. `src/lib/education/anki-deck-path.ts` translates it to SnapOrtho for product delivery. Name matches alone are not a deletion criterion.

The production graph registry contains 1,023 canonical entities, 2,187 relationships, and 26 curriculum bridges marked beta active. Those objects must not be deleted just because old imported cards link to them. No claim is made here that every graph object is semantically correct.

## Proposed first cleanup

Confirm that cards outside the current 3,670-card release should no longer participate in active workflows, including the 29 approved links. Then:

1. Recheck the current source and sync release IDs and the exact candidate set; stop if they have changed.
2. Save the before-state of each affected row and its ID for precise restoration. The candidate manifest is an inventory, not a full database backup.
3. In one transaction, deactivate only the 1,425 candidate canonical cards, their source card records, and their active card-level graph/mapping rows. Preserve approved review decisions as historical evidence. Determine active mapping-candidate counts immediately before applying.
4. Preserve notes, immutable versions, releases, membership manifests, metadata history, media, graph entities, and sync operations.
5. Verify all 3,670 current cards remain active, current sync membership/checksums remain unchanged, and no active links remain for the retired cohort. Verify representative current card search and reviewer resolution paths.
6. Restore only the captured affected rows if verification fails. Do not bulk-reactivate unrelated historical rows.

This first pass improves active data hygiene but does not reclaim disk space. Physical deletion and old draft retirement need a separate retention decision and a complete metadata/sync dependency check. Approximate largest Anki relations include sync delta operations (25.7 MiB) and sync note versions (22.4 MiB); their sizes alone do not establish waste.

## Application evidence

- `src/app/anki/page.tsx`: selects newest published deck and its included memberships.
- `src/lib/brobot/chat/anki-linker.ts`: checks release membership and active pinned card versions.
- `src/app/api/anki/deck/v2/updates/route.ts`: depends on superseded sync lineage.
- `src/app/api/anki/reviewer/workspace/resolve-card/route.ts`: still reads imported and canonical card tables.
- `docs/education/versioned-anki-deck-foundation.md`: describes immutable release history.

## Remaining decision

Are the 1,425 cards outside the current release intentionally retained for future authoring, or should they and their card-level mappings be deactivated? Their approved links make this a content decision that cannot be inferred safely from release exclusion alone.
