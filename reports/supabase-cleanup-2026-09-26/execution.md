# Supabase cleanup applied — 2026-09-26

Project: `snaportho` (`geznczcokbgybsseipjg`). The user approved deactivation of cards outside the versioned deck and replacing old deck references with SnapOrtho.

## Live changes

| Change | Rows |
| --- | ---: |
| Extra canonical cards deactivated | 1,425 |
| Corresponding imported cards deactivated | 1,425 |
| Approved canonical entity links deactivated | 29 |
| Automatic knowledge links deactivated | 70 |
| Mapping candidates deactivated | 860 |
| Deck records renamed to SnapOrtho | 817 |
| Mapping-run metadata records renamed | 4 |
| Metadata batch cohort labels renamed | 2,312 |

There are now exactly **3,670 active canonical cards and 3,670 active source cards**, all in the current published versioned deck. No active entity links, knowledge links, or mapping candidates remain for inactive canonical cards. Deactivation preserves history and does not reclaim disk space.

Changes ran in two transactions, with table locks, short lock timeouts, exact before-state fingerprints, row-count assertions, and postcondition checks. The approved candidate IDs were pinned to the prior audit; the operation did not simply deactivate every card absent from an unverified latest release. Renaming was checked for duplicate deck-name collisions before application.

No schema, RLS, grants, authentication, or storage objects were changed. Existing update timestamp triggers ran normally. No permanent backup tables were added to the database.

## Preserved history and old names

The current published sync release `0.0.9` contains 3,670 notes and already has **zero old-name references** in its note versions. All editable deck records, mapping-run metadata, and metadata batch labels now have zero old-name references.

A scan of 95 Anki, canonical, graph, metadata, source, and ontology tables found the old name in six tables before cleanup. Three editable tables were renamed. References remain in these checksum-protected historical structures:

- `anki_deck_release_cards`: 16,123 rows across published and draft source manifests, including the current v1 source manifest.
- `anki_sync_v2_note_versions`: 11,551 historical note versions.
- `anki_sync_v2_delta_operations`: 11,536 historical sync operations.

These were not rewritten. Release membership, payload hashes, and historical sync cursors must remain consistent for existing add-ons. The v2 updates API still replays superseded releases, so historical payloads are not merely unused backups. Literal removal of every old-name string would require a separate release-history and client-migration project; this cleanup does not claim to have removed those strings.

Shared source notes, canonical versions, media, release memberships, metadata assertions, and graph entities remain intact. The 414 extra cards that share notes with current cards were deactivated at card level. No shared notes were deleted.

## Local code updates

These changes are saved in the working tree and **have not been deployed**:

- Both import and product deck-path helpers now return SnapOrtho. A single explicit legacy-root adapter remains for reading old imports and immutable snapshots.
- Future imports normalize stored deck names and paths to SnapOrtho.
- Mapping priorities, evidence-collector branch hints, and the patellar-instability review script use SnapOrtho.
- New metadata cohort labels normalize paths read from historical source manifests.
- Brobot card responses, message references, the card linker, and reviewer queue normalize deck names for display without changing the underlying signed manifests.

Historical reports and fixtures retain their original evidence. Cleanup backups also intentionally contain the previous values. Unrelated pre-existing/concurrent working-tree changes were left untouched. The legacy importer can still explicitly import a complete deck; this work does not install a database rule prohibiting future deliberate reactivation/imports.

## Verification

- Exact active-card and inactive-link checks passed; see `verification.json`.
- All eight protected tables have identical before/after row counts and content fingerprints: source releases/memberships, sync releases/memberships/note versions/delta operations/media, and canonical card versions.
- Live concept search for `hip` and `fracture` returned five results, all active and belonging to the protected current source release.
- Deck-path, note-release-v2, manifest-assembly, and bootstrap-package tests passed.
- ESLint passed for the modified application helper and API files; `git diff --check` passed.
- The guarded rollback script was rehearsed inside a transaction ending in `ROLLBACK`; all its before-state checks and restoration statements passed. The cleanup remained applied afterward, with 3,670 active cards.

The local API changes were not exercised against a deployed authenticated session. The database checks verify current card membership and search behavior, not every product workflow.

## Recovery files

- `deactivate-extra-cards.sql`: applied deactivation transaction. Its preconditions intentionally reject rerunning against the cleaned database.
- `rename-editable-deck-references.sql`: applied rename transaction, also guarded against reruns.
- `deactivation-before-state.json`: previous activation fields, IDs, timestamps, and row fingerprints.
- `rename-before-state.json`: previous names/metadata and row fingerprints.
- `affected-after-state.json`: exact row fingerprints after cleanup.
- `protected-before-state.json` and `verification.json`: unchanged-history evidence.
- `rollback-cleanup.sql`: restores only the changed fields for the captured IDs, and refuses to overwrite rows edited since cleanup. It restores logical values; normal update triggers record the rollback time rather than restoring old `updated_at` timestamps. Review before executing, because it intentionally reactivates the removed cohort and restores the old names.

These are targeted recovery records, not a complete database backup. They contain no card-body or user-account export.
