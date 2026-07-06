# Canonical Apply Report — Ankle Fracture Staging Proof

**Generated:** 2026-07-05  
**Reviewer identity:** `staging_test_reviewer_not_clinical`  
**Clinical verification:** **NO** — staging automation only

## Commands

**Dry-run:**
```bash
KG_TARGET_ENV=staging npm run kg:pilot:ankle:apply-approved -- --dry-run
```

**Apply (staging-approved auto-low-risk only):**
```bash
KG_TARGET_ENV=staging npm run kg:pilot:ankle:apply-approved
```

## Apply summary

| Object type | Applied | Notes |
|-------------|--------:|-------|
| `canonical_entities` | **19** | All auto-approved entity proposals |
| `canonical_relationships` | **21** | Auto-approved low-risk edges only |
| `curriculum_node_entities` bridge | **1** | `trauma-ankle-fractures` → `ankle-fracture` |
| `educational_claims` | **1** | Inserted as `generated_draft` / `unreviewed` |
| `decision_points` | **0** | Gated — attending review required |
| Proposals marked `applied` | **42** | |

## Intentionally NOT applied (16 proposals)

| Route | Count | Reason |
|-------|------:|--------|
| Human review | 5 | Awaiting curator review |
| Attending review | 10 | Safety/management DPs and high-risk edges |
| Auto-revised | 1 | Light confirmation still needed |

**Pending relationship examples (not applied):**
- `at_risk_structure` (superficial peroneal nerve)
- `indicates_treatment` (medial clear space → ORIF)
- `treated_by`, `uses_fixation`
- `explains_instability` edges

**Pending claims (6):** all remain `needs_review` in `kg_automation_proposals`  
**Pending decision points (2):** operative/nonoperative pathways — **not clinically verified**

## Draft leak safeguards

| Check | Result |
|-------|--------|
| Claims inserted as `verified` | **0** ✅ |
| Claims inserted as `generated_draft` | **1** ✅ |
| DPs inserted as `verified` | **0** ✅ |
| DPs inserted without staging gate | **0** ✅ |

Applied rows carry metadata:
- `staging_apply: true`
- `clinical_verification: false`
- `staging_reviewer: staging_test_reviewer_not_clinical`

## Staging review mode (optional, not used)

Decision points can only be inserted in staging draft mode with explicit flags:
```bash
KG_TARGET_ENV=staging KG_STAGING_REVIEW_MODE=1 npm run kg:pilot:ankle:apply-approved -- --include-staging-drafts
```
This was **not** run — DPs remain unapplied by design.