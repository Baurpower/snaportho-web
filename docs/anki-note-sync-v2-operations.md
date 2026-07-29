# SnapOrtho Anki note sync v2 operations

Sync v2 is additive and intentionally does not write through the retired v1
card/hash planner. An installed deck remains studyable while v2 is unpublished.

## Components

- Migration: `supabase/migrations/20260728_130000_anki_note_sync_v2.sql`
- Release builder: `src/lib/education/anki-note-release-v2.ts`
- Publisher: `scripts/publish-anki-note-sync-v2-release.ts`
- Status API: `GET /api/anki/deck/v2/status`
- Delta API: `GET /api/anki/deck/v2/updates?after=<cursor>&limit=<1..500>`
- Add-on merge/importer: `deck_sync_v2.py`
- Local mirror: schema version 4 in `state.py`

## Rollout

1. Back up the production database and the canary Anki profile.
2. Apply `20260728_130000_anki_note_sync_v2.sql`.
3. Deploy the v2 status and updates endpoints.
4. Build a dry-run release:

   `npm run anki:sync-v2:publish -- --release-version 1.0.0`

5. Confirm that note/card counts match the source release and inspect the
   aggregate checksum.
6. Publish:

   `npm run anki:sync-v2:publish -- --release-version 1.0.0 --apply`

7. Install the 1.0.0 add-on in a backed-up canary profile.
8. Copy **Safe Diagnostics** before updating.
9. Update 25 notes, verify collection diff and scheduling, then publish a new
   release for 250 notes. Do not mutate the existing release.
10. Publish the complete deck only after the second run produces zero writes.

## Actual master-deck dry run (2026-07-28)

The read-only publisher was run against production source release
`7764b632-5622-4f1b-959d-1874908fc46d`.

- Source notes: 3,670
- Source cards: 3,670
- Media assets: 1,616
- Aggregate v2 checksum:
  `da31fe7823f3c65423bc22158e85cc2471b1ab0ac366b5daaec2055f517e3132`

The source release groups cleanly at one card per note. The affected local
profile's larger 3,921-card inventory is therefore local drift, not the intended
published deck shape. Sync v2 matches by stable note GUID and updates the note
once; it does not accept the drifted card inventory as canonical.

## Release rules

- Never update a published v2 release or operation.
- Never attach the latest tag/media manifest at read time.
- Every metadata change creates a successor release.
- Every page must pass payload, page, cursor, count, and aggregate checks.
- The local cursor advances only after the corresponding operation journal row
  is marked applied.
- Existing Anki cards are never recreated merely to deliver a note update.

## Recovery

The add-on SQLite database stores:

- subscription release and cursor;
- canonical note to Anki note mapping;
- last remote field/tag baselines;
- an apply journal containing the pre-write snapshot.

An interrupted run is resumed from its last committed cursor. A pending journal
row is surfaced in Safe Diagnostics and must be resolved before automatic
updates are enabled.

The existing v1 profile should not be re-imported. Use Safe Diagnostics to
measure duplicate card markers, cloze sibling collisions, and hash divergence
without exporting card content.
