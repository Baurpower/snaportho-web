# Existing proposal and apply lifecycle findings

## Proposal storage

`kg_automation_proposals` stores one semantic proposal per
`proposal_fingerprint`. A partial unique index permits only one active row for a
fingerprint. The same row also carries global review lifecycle fields
(`review_status`, `reviewed_by`, `reviewed_at`, `applied_at`, `superseded_by`) and
previously carried batch/topic association only inside `metadata.pilot` and
`metadata.staging_batch_key`.

Persistence looked up active rows by fingerprint and updated the entire row when
one existed. Consequently, persisting a second neighborhood could replace the
first neighborhood's metadata and could downgrade an `applied` proposal to
`approved`.

## Apply and rollback

Apply selected active proposal rows by `metadata.pilot`, optional
`metadata.staging_batch_key`, and global `review_status = approved`. It created or
reused canonical entities, relationships, and curriculum bridges, then changed
the semantic proposal to `applied`.

Canonical inserts carry `metadata.staging_batch_key` and
`created_from_proposal_fingerprint`. Apply reports also record per-proposal
canonical targets, but the reports are filesystem artifacts rather than a
database attribution ledger.

Rollback selected canonical rows by their creation batch metadata. It could
therefore safely identify inserts made by that batch, but it also reset semantic
proposal state by the proposal's single metadata batch assignment. It had no way
to represent a second batch accepting a canonical object created by another
batch.

## Minimal correction

Preserve `kg_automation_proposals` as the semantic deduplication table. Add one
junction row per proposal and batch. The membership stores packet provenance,
packet approval, batch-specific apply disposition, and the canonical target when
the batch actually creates or verifies one. This membership row is sufficient
mutation attribution for the current insert-or-reuse apply behavior; no separate
general apply-event system is required.
