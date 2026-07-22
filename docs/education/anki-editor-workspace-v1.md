# Anki editor workspace v1

This first vertical slice gives an active `clinical_editor` an assignment-independent **Review Current Card** workspace while studying. It resolves an existing master card by note GUID, card ordinal, and exact content hash; a card not found in the canonical registry becomes a `create_missing_card` proposal. It never creates a canonical card directly.

The workspace exposes central card fields, proposed central tags/deck path, active canonical-entity search, mapping corrections, and new-entity/new-alias suggestions. All changes are submitted together as one immutable `anki_editor_workspace_proposals` record. Submission returns `canonicalDataChanged: false` and does not approve, incorporate, publish, or mutate KG topology.

## Personal customization boundary

Names beginning with `Personal_`, `personal::`, `user::`, or `local::` are personal. The add-on excludes those fields and tags from central proposal payloads. The server contract is strict and has no personal-fields, personal-tags, scheduling, or review-history property. V1 does not synchronize personal data; a later local-only feature may edit/store it without uploading it.

Central deck paths and central tags are proposals, not direct changes. Review/adjudication and immutable release incorporation remain future phases.

## Required backend state

The existing reviewer workflow migration and the new `20260721_120000_anki_editor_workspace.sql` migration must eventually be applied in dependency order. The user must have an active `anki_reviewers` row with `clinical_editor`; KG search also accepts `mapping_reviewer` (or `clinical_editor` through the existing role rule). No migration is applied by repository tests or packaging.

## Current UI boundary

V1 is available from Tools → SnapOrtho Reviewer → Review Current Card when a study card is open. Browse and dashboard entry points should instantiate this same workspace in the next phase. Download/upload release synchronization is intentionally not part of this slice.

## Verification

Run:

```bash
npm run education:anki-reviewer:test
npm run education:anki-reviewer-addon:test
npm run anki:reviewer:package
npm run anki:reviewer:verify-package
```
