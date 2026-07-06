# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:01:27.986Z

**Items requiring human judgment:** 6
**Auto-curated (low-risk):** 74

Everything else was classified and justified by the first-pass curator.

## rel|knee-osteoarthritis|indicates_treatment|total-knee-arthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** knee-osteoarthritis -[indicates_treatment]-> total-knee-arthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: knee-osteoarthritis -[indicates_treatment]-> total-knee-arthroplasty

**Rationale:**
- Rule: high_risk_predicate

## rel|knee-osteoarthritis|indicates_treatment|unicompartmental-knee-arthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** knee-osteoarthritis -[indicates_treatment]-> unicompartmental-knee-arthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: knee-osteoarthritis -[indicates_treatment]-> unicompartmental-knee-arthroplasty

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-knee-osteoarthritis-core

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-knee-osteoarthritis-core

**Rationale:**
- Rule: l1_management_fact

## claim|claim-knee-osteoarthritis-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-knee-osteoarthritis-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-knee-osteoarthritis-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-knee-osteoarthritis-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-knee-osteoarthritis-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-knee-osteoarthritis-operative

**Rationale:**
- Rule: decision_point_requires_attending

