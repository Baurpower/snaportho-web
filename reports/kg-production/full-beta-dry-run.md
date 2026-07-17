# Full Beta Dry Run

Release: `kg-beta-20260716-002`
Status: **PASSED**

The migration, release upserts, deduplicated object projection, authenticated RPC projection, idempotent second upsert, and soft rollback were simulated inside one PostgreSQL transaction and rolled back.

Dry-run discrepancies: 0.

- All release entity, relationship, and bridge IDs exist.
- Every released relationship has active endpoints.
- Shared canonical objects are unique once per release.
- Blocked and high-risk incomplete-provenance objects remain excluded.
- Product reads expose release, review, provenance, risk, coverage, and verification metadata.
- Soft rollback makes the simulated release invisible without canonical mutations.
