# Ankle Staging Proof Summary

**Date:** 2026-07-05  
**Scope:** ankle-fracture only — end-to-end compiler → persist → apply → recompile

## Loop proven ✅

```
compiler plan → proposal persistence → review routing → canonical apply → DB-backed recompile → maturity/readiness
```

## Environment

| Setting | Value |
|---------|-------|
| Target | staging (`geznczcokbgybsseipjg`) |
| Guard | `KG_TARGET_ENV=staging` + project allowlist |
| Production modified | **NO** |

## End-to-end results

| Stage | Result |
|-------|--------|
| 1. Migration | Applied vocabulary extension |
| 2. Generate | 58 proposals, 0 validation errors |
| 3. Curate | 42 auto / 16 escalated |
| 4. Persist | 58/58 without CHECK failures |
| 5. Dry-run apply | 42 mutations planned |
| 6. Canonical apply | 19 entities, 21 rels, 1 bridge, 1 draft claim |
| 7. DB-backed compile | Reads canonical DB ✅ |
| 8. Maturity | 5 → **6** (factory quality) |

## Proposals status

| Status | Count |
|--------|------:|
| Applied | 42 |
| Pending review | 16 |
| Rejected | 0 |

## Tests run

```bash
npm run kg:staging:guard:test      # ✅
npm run kg:staging:proof:test      # ✅
npm run kg:compile:test            # ✅
```

## New scripts

| Script | Purpose |
|--------|---------|
| `kg:pilot:ankle:migrate-apply` | Staging-guarded migration apply |
| `kg:pilot:ankle:apply-approved` | Slug-resolving ankle canonical apply |
| `kg:compile --db-backed` | Compiler reads canonical DB state |

## Is ankle ready for product traversal pilot?

**Not yet.** The staging proof demonstrates the factory loop works, but product traversal requires:

- Attending review on 10 safety/management items
- Application of remaining 8 high-risk relationships
- 6 additional claims reviewed (still `generated_draft`)
- 2 decision points verified (currently unapplied)
- Maturity Level 7 with review completeness ≥ 0.85

**Traversal smoke test:** partial — 21 canonical relationships traversable from `ankle-fracture` anchor.

## Critical warning

> **All staging approvals are automation test approvals (`staging_test_reviewer_not_clinical`), NOT clinical verification.**  
> Do not publish to learners. Do not mark safety-critical DPs as verified without attending audit trail.