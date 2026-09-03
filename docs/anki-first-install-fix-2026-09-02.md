# First-install correction (add-on 1.0.4)

## Implemented locally

- Installation requires actual Master notes or complete installation markers in the collection. A saved cursor or matching legacy GUIDs is insufficient.
- Profiles with no matching note types/marker fields no longer fall back to scanning every card when Anki's note search is available.
- Update checks report batches, operation count, and cursor. Pages are validated before being offered for application. Repeated cursors, inconsistent empty pages, a 180-second between-request deadline, and a 1,000-page limit stop the check with diagnostics. Individual requests retain their network timeout/retry policy; the deadline does not interrupt an in-flight request.
- Closing or refreshing the dialog cancels the check between requests and suppresses its stale UI callbacks.
- Bootstrap packages place all cards in `SnapOrtho`. The empty Anki `Default` deck remains as required collection metadata. Existing namespace filtering exports only `SnapOrtho::…` tags.
- Note-release generation and add-on creation of new notes use `SnapOrtho`, including when replaying older releases containing legacy deck paths. Existing notes are not automatically relocated and personal tags remain untouched.

## Verification

- 64 Python tests passed, including legacy routing, stale cursor, pagination progress, repeated cursor, deadline, cancellation, and page-limit cases.
- Bootstrap note-type, built-package SQLite inspection, and note-release tests passed.
- User and reviewer 1.0.4 packages built; reviewer package verification passed.
- Not tested interactively in a real Anki profile or against the affected downloaded package.

## Rollout still required

1. Back up and test on a disposable copy of an affected profile, plus a clean profile.
2. Rebuild the published bootstrap artifact using the corrected builder and the intended release/tag snapshot; verify actual note/card/media counts and deck/tag assignments before registering it.
3. Publish the corrected artifact and add-on through the normal release process. Nothing was deployed during this change.
4. Validate existing-note import conflicts before migrating real legacy notes. Automatic note-type conversion, bulk legacy-tag removal, and moving existing cards are deliberately not implemented. The installation screen explains the backup/conflict workflow rather than claiming GUID matching is a safe migration.

Do not delete legacy notes or reset scheduling to work around import conflicts. A validated migration must preserve note/card identity, scheduling, personal fields, and user-owned tags. The original affected `.apkg` and an import report are still needed to establish precisely what that user downloaded and what Anki imported.
