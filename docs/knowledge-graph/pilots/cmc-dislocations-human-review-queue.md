# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-06T00:02:46.354Z

**Items requiring human judgment:** 11
**Auto-curated (low-risk):** 160

Everything else was classified and justified by the first-pass curator.

## rel|cmc-dislocations|differential_for|bennett-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** cmc-dislocations -[differential_for]-> bennett-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|cmc-dislocations|differential_for|bennett-fracture

**Rationale:**
- Rule: default_human_review

## rel|cmc-dislocations|differential_for|thumb-ucl-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** cmc-dislocations -[differential_for]-> thumb-ucl-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|cmc-dislocations|differential_for|thumb-ucl-injury

**Rationale:**
- Rule: default_human_review

## rel|cmc-dislocations|treated_by|cmc-dislocations-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** cmc-dislocations -[treated_by]-> cmc-dislocations-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|cmc-dislocations|treated_by|cmc-dislocations-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-cmc-dislocations-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cmc-dislocations-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-cmc-dislocations-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cmc-dislocations-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-cmc-dislocations-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cmc-dislocations-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-cmc-dislocations-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cmc-dislocations-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-cmc-dislocations-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cmc-dislocations-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-cmc-dislocations-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cmc-dislocations-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-cmc-dislocations-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-cmc-dislocations-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-cmc-dislocations-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-cmc-dislocations-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

