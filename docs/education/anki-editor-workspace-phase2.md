# Anki editor workspace Phase 2

Phase 2 closes the proposal and adjudication loop without incorporating or publishing canonical data.

## Surfaces

- **Reviewer:** a right-side SnapOrtho dock reports master-card/version/KG state and opens the shared workspace.
- **Browse:** Edit → Open SnapOrtho Card Workspace opens the selected cohort using `sourceSurface=browser`, with Previous/Next navigation.
- **Dashboard:** the proposal queue shows safe list metadata; selecting a proposal loads bodies and a before/after/KG review detail view.

All surfaces use `CardWorkspace`. Content, central tag/deck-path, mapping, missing-card, and KG-expansion changes share one version-pinned payload.

## Drafts and personal data

Workspace drafts persist in profile-scoped SQLite schema v3 using note GUID, ordinal, and base version. Restart recovery preserves the original idempotency key. A changed local content hash marks the draft `conflict` and requires manual comparison.

`Personal_`, `personal::`, `user::`, and `local::` fields/tags are excluded from central payloads. Scheduling and review history are absent from the contract. Personal edits are not synchronized in this phase.

## Queue and adjudication

List responses exclude card bodies. Authenticated detail responses include the proposal evidence. Review actions are immutable and bind to `proposal_evidence_hash`. The database function records the action and lifecycle transition atomically.

Fail-closed rules include:

- missing-card and KG-expansion approval cannot be self-approved;
- KG-expansion approval requires `administrator` in Phase 2;
- mapping removal requires the `clinical_editor` review endpoint;
- stale card versions, inactive cards, inactive entities, changed evidence, and reused idempotency keys conflict;
- approval means only `approved_for_incorporation`.

No endpoint inserts canonical cards/versions/entities/relationships/mappings or publishes a release.

## Operational tooling

`education:anki-reviewer:prepare-user` validates explicit reviewer inputs and prints a dry-run provisioning record. It cannot write a database. `education:anki-reviewer:validate-runtime -- --user-id=<uuid>` uses a read-only transaction to report migration and reviewer state.

## Deferred

Native Browser toolbar placement, personal-card sync, proposal incorporation, release generation, APKG bootstrap, deltas, and media synchronization remain Phase 3+ work.

## Migration and rollback boundary

The code depends on `20260720_180000_anki_reviewer_workflow.sql` followed by `20260721_120000_anki_editor_workspace.sql`. Neither is applied by this implementation. Before application, rollback is source removal. After application and before proposal data exists, drop `record_anki_editor_workspace_review`, review actions, proposals, and their guard function in dependency order. Once reviewer evidence exists, preserve/export it rather than dropping it.
