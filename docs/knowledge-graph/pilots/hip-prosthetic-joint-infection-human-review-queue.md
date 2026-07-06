# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:50:09.531Z

**Items requiring human judgment:** 5
**Auto-curated (low-risk):** 75

Everything else was classified and justified by the first-pass curator.

## rel|hip-prosthetic-joint-infection|treated_by|hip-irrigation-debridement

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** hip-prosthetic-joint-infection -[treated_by]-> hip-irrigation-debridement
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|hip-prosthetic-joint-infection|treated_by|hip-irrigation-debridement

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-hip-prosthetic-joint-infection-core

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-hip-prosthetic-joint-infection-core

**Rationale:**
- Rule: l1_management_fact

## claim|claim-hip-prosthetic-joint-infection-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-hip-prosthetic-joint-infection-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-hip-prosthetic-joint-infection-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-hip-prosthetic-joint-infection-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-hip-prosthetic-joint-infection-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-hip-prosthetic-joint-infection-operative

**Rationale:**
- Rule: decision_point_requires_attending

