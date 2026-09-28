# KG Identity vNext — Rollout Plan

Safe, staged, reversible. No step merges, repoints, or deletes anything.

## Preconditions

- Code merged: contracts, factory, backfill, tool, tests (this phase).
- Review the migration file
  `supabase/migrations/20260927170000_claim_semantic_identity.sql` in full.
- Networked environment with service-role access for migration + verification.

## Stage 1 — Deploy code (no migration)

Deploy the application code first. Factory/backfill outputs gain semantic
fields; nothing writes them yet (columns absent). The backfill stays dormant
(`apply=false`); the OB route behavior is unchanged (commit function still
the old one until Stage 2).

Exit: app healthy; factory dry-run artifacts include `semanticCandidates`.

## Stage 2 — Apply migration (additive DDL + backfill)

Apply `20260927170000_claim_semantic_identity.sql` via the normal migration
pipeline (never hand-applied SQL). It creates the semantic functions,
adds nullable columns, updates sync triggers, backfills semantic values
deterministically, adds non-unique indexes, and replaces the v4 commit
function (dedup behavior identical).

Expected: all existing claims/versions gain `semantic_identity_version='v1'`;
legacy columns byte-identical. Exit: migration completes; row counts unchanged.

## Stage 3 — Verify (read-only)

Run `supabase/verification/claim_semantic_identity.sql`. All informational
selects reviewed; hard gates (parity breaches, legacy damage, orphans) at
zero. Also run the tool in `--db` mode and diff offline vs live semantic
fingerprints (must match exactly).

Exit: verification green; parity confirmed.

## Stage 4 — Observe

Monitor: commit-path reason codes (`semantic_identity_v1` present on new OB
commits), link metadata carrying semantic hashes, no unexpected
`claim_conflict` uptick. Record live counts (Stage 0 of the KG plan) as the
new baseline.

Exit: one clean observation window (suggest 7 days) with no anomalies.

## Rollback (reversible)

The migration is additive-only. To roll back:

1. Deploy code without semantic writes (or keep — nullable columns tolerate
   absence either way).
2. Run the downgrade: drop the two partial indexes, drop the version/claim
   semantic columns, restore the previous `sync_*` trigger functions and
   `commit_orthobullets_machine_claim` body from
   `20260926220000_orthobullets_claim_v4_pipeline.sql`, drop the three
   semantic functions. (A commented downgrade block can be generated on
   request; it was omitted from the migration per repo convention of
   forward-only migrations with restore-from-prior-file rollback.)
3. No data repair needed: legacy columns were never modified.

## Explicit non-goals for rollout

No `equivalent_to` edges, no claim merges, no unique merge-key index, no OB
scale ingestion, no backfill apply-mode reactivation (separate decision with
its own review). Those belong to the merge phase.
