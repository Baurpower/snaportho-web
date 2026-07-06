# Hip Fracture Cluster — Staging Apply

Generated: 2026-07-05T21:42:39.210Z

Staging target: `geznczcokbgybsseipjg` with `KG_TARGET_ENV=staging`. Production modified: **no**.

Manufacturing order: femoral-neck-fracture (shared anatomy owner) → intertrochanteric-fracture → subtrochanteric-fracture.
Second apply pass executed for femoral-neck and intertrochanteric after shared slug resolution (same pattern as tibial-shaft cluster).

## Per-neighborhood apply totals (cumulative passes)

| Neighborhood | Entities | Relationships | Bridges | Draft claims | DPs applied |
|--------------|--------:|--------------:|--------:|-------------:|------------:|
| Femoral Neck Fracture | 8 | 11 | 1 | 1 | 0 |
| Intertrochanteric Fracture | 5 | 10 | 1 | 1 | 0 |
| Subtrochanteric Fracture | 17 | 19 | 1 | 1 | 0 |

## Shared anatomy deduplication

Sibling pilots emit `create_canonical_entity` proposals for shared slugs (for relationship validation). Staging apply skips inserts when slug already exists — **no duplicate canonical rows** for shared anatomy.

## Provenance tags

- `staging_apply: true`
- `staging_reviewer: staging_test_reviewer_not_clinical`
- `clinical_verification: false`
- Claims: `content_source: generated_draft`, `review_status: unreviewed`
- Decision points: **not applied** (gated for attending)

