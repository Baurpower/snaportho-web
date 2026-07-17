# Carpal Tunnel Syndrome — Staging Schema Gate

Checked: 2026-07-15 against the allowlisted staging project `geznczcokbgybsseipjg`.

The finalized packet was staging-ready with zero content staging blockers. Guarded persistence was initially attempted using:

`npm run kg:staging:persist -- --manifest reports/kg-staging/carpal-tunnel-syndrome/cts-0c2b2fa3ef5af8aa/proposal-manifest.json`

The initial command stopped before proposal or canonical mutation because `public.kg_proposal_batch_memberships` did not exist in staging. This table is required for non-destructive reuse of the 149 semantic proposal fingerprints shared with other batches.

Gate cleared later on 2026-07-15: the table became available. Persistence, guarded dry run, guarded apply, strict database reload, independent audit, and rollback dry run all completed. See `persistence-report.json`, `apply-dry-run-report.json`, `apply-report.json`, and `rollback-dry-run-report.json` in this directory.

The initial failed attempt performed no mutation. The later guarded apply was a real staging write; no rollback mutation was performed.
