# Post-Migration Persist Report — Ankle Fracture Staging Proof

**Generated:** 2026-07-05  
**Environment:** staging (`geznczcokbgybsseipjg.supabase.co`)  
**Guard:** `KG_TARGET_ENV=staging` required

## Migration

**Command:**
```bash
KG_TARGET_ENV=staging npm run kg:pilot:ankle:migrate-apply
```

**Migration file:** `supabase/migrations/20260705_120000_ankle_pilot_kg_vocabulary.sql`

**Verification (post-apply):**
| Check | Result |
|-------|--------|
| `educational_claims` table | ✅ exists |
| `decision_points` table | ✅ exists |
| `classification_grade` entity type | ✅ in CHECK |
| `injured_in` predicate | ✅ in CHECK |
| `propose_educational_claim` proposal type | ✅ in CHECK |

## Pipeline commands run

```bash
npm run kg:pilot:ankle:generate
npm run kg:pilot:ankle:curate
npm run kg:pilot:ankle:persist
```

## Persist result (post-migration)

| Metric | Before migration | After migration |
|--------|-----------------:|----------------:|
| Proposals persisted | 28 updated, **30 CHECK failures** | **58 updated, 0 errors** |
| Total ankle pilot proposals in DB | 49 | **58** |
| Review routing in DB | mixed `generated`/`needs_review` | **42 `approved`, 16 `needs_review`** |

**Curation routing (unchanged):**
- 42 auto-approved low-risk
- 1 auto-revised
- 5 human review
- 10 attending review

## Constraint failures resolved

Pre-migration failures included:
- `classification_grade`, `fixation_method` entity types
- `injured_in`, `part_of`, `has_grade`, `uses_fixation`, etc. predicates
- `propose_educational_claim`, `propose_decision_point` proposal types

All 58 proposals now persist without CHECK constraint violations.

## Staging-only warning

All writes targeted project ref `geznczcokbgybsseipjg` (staging allowlist).  
**Not applied to production.**