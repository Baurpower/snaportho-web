# Ankle Publication Readiness — After Staging Apply

**Generated:** 2026-07-05  
**Environment:** staging only

## Readiness scorecard

| Gate | Status |
|------|--------|
| Migration applied | ✅ staging |
| All 58 proposals persist | ✅ |
| Canonical entities populated | ✅ 19 |
| Canonical relationships populated | ✅ 21 |
| Claims table available | ✅ |
| Decision points table available | ✅ |
| Auto-approved apply complete | ✅ 42/42 |
| Human/attending queue cleared | ❌ 16 pending |
| Draft leak (verified claims) | ✅ none |
| Publication ready | ❌ **not ready** |

## Maturity

| Source | Level | Required |
|--------|------:|---------:|
| Factory quality report | **6** | 7 |
| Compiler publication validator | **5** | 7 |

## Remaining blockers

1. **16 proposals pending review** — 8 relationships, 6 claims, 2 decision points
2. **Attending review required** — operative indication DPs, `at_risk_structure`, `indicates_treatment`
3. **Claims are `generated_draft`** — publication gate blocks verified consumption
4. **8 relationships not yet applied** — high-risk edges remain spec-only
5. **Asset links not proposed** — Anki/question retarget proposals still missing

## Product readiness gates

| Product | Ready | Notes |
|---------|-------|-------|
| Traversal smoke test | **Partial** | 21/29 core edges in DB |
| Prepare | **No** | Needs Level 6+ with review completeness |
| BroBot | **No** | Needs Level 7 + attending sign-off on DPs |

## Recommended next steps (staging)

1. Route 16-item human/attending queue to clinical reviewers
2. Apply remaining approved relationships after attending sign-off
3. Re-run `npm run kg:compile -- --topic ankle-fracture --db-backed`
4. Target maturity Level 7 before product traversal pilot

## Staging-only warning

All applied content is tagged `clinical_verification: false`.  
**This is not clinical verification and must not be used for learner-facing publication.**