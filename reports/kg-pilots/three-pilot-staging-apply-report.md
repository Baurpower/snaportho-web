# Three-Pilot Staging Apply Report

Generated: 2026-07-05T21:10:29.556Z

Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`.
Production modified: **no**.

## Migration

Shared vocabulary migration `20260705_120000_ankle_pilot_kg_vocabulary.sql` applied once (idempotent).

## Per-pilot apply results

| Pilot | Approved loaded | Entities | Relationships | Bridges | Draft claims | DPs applied | Marked applied |
|-------|----------------:|---------:|--------------:|--------:|-------------:|------------:|---------------:|
| Ankle Fracture | 0 (prior) | 19 | 21 | 1 | 1 | 0 | 42 |

> Ankle Fracture: Ankle pilot was applied in prior staging proof (2026-07-05). No approved proposals remain — all 42 auto-approved rows already marked applied.

| Compartment Syndrome | 36 | 14 | 20 | 1 | 1 | 0 | 36 |
| Distal Radius Fracture | 31 | 14 | 15 | 1 | 1 | 0 | 31 |

## Provenance tags on all applied rows

- `staging_apply: true`
- `staging_reviewer: staging_test_reviewer_not_clinical`
- `clinical_verification: false`
- Claims: `content_source: generated_draft`, `review_status: unreviewed`
- Decision points: **not applied** (gated)

