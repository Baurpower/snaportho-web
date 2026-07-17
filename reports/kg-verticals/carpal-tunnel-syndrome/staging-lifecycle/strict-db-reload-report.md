# Carpal Tunnel Syndrome — Staging Apply and Strict Database Verification

Run date: 2026-07-15. Prior state: `staging_ready`. Current state: `database_verified`, publication blocked.

Batch `cts-0c2b2fa3ef5af8aa` persisted 207 memberships: 58 new semantic proposals and 149 reused proposals, with zero overwrites or lifecycle downgrades. Guarded apply processed all 207 proposals with zero failures: 58 created, 56 reused, 80 already present, and 13 previously applied.

Strict database-only reload matched the finalized staging graph at 92 entities and 114 relationships; unresolved claims and decision points were correctly absent from canonical verified state. The batch contained 207 approved proposals. Independent strict audit: 79/100, `NOT_READY`.

Rollback dry run proved scope for 34 batch-created relationships, 1 bridge, and 23 batch-created entities; reused rows affected: 0. No rollback mutation was performed.

Publication remains blocked by review/provenance and stale publication diagnostics; staging and structural database verification are complete.
