# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:21:53.626Z

**Items requiring human judgment:** 5
**Auto-curated (low-risk):** 76

Everything else was classified and justified by the first-pass curator.

## rel|periprosthetic-joint-infection|treated_by|two-stage-revision-arthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** periprosthetic-joint-infection -[treated_by]-> two-stage-revision-arthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|periprosthetic-joint-infection|treated_by|two-stage-revision-arthroplasty

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-periprosthetic-joint-infection-core

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-periprosthetic-joint-infection-core

**Rationale:**
- Rule: l1_management_fact

## claim|claim-periprosthetic-joint-infection-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-periprosthetic-joint-infection-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-periprosthetic-joint-infection-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-periprosthetic-joint-infection-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-periprosthetic-joint-infection-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-periprosthetic-joint-infection-operative

**Rationale:**
- Rule: decision_point_requires_attending

