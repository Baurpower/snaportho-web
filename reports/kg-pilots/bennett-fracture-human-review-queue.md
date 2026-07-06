# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:49:47.339Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 165

Everything else was classified and justified by the first-pass curator.

## rel|bennett-fracture|differential_for|rolando-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** bennett-fracture -[differential_for]-> rolando-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|bennett-fracture|differential_for|rolando-fracture

**Rationale:**
- Rule: default_human_review

## rel|bennett-fracture|differential_for|thumb-ucl-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** bennett-fracture -[differential_for]-> thumb-ucl-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|bennett-fracture|differential_for|thumb-ucl-injury

**Rationale:**
- Rule: default_human_review

## rel|bennett-fracture|differential_for|cmc-dislocations

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** bennett-fracture -[differential_for]-> cmc-dislocations
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|bennett-fracture|differential_for|cmc-dislocations

**Rationale:**
- Rule: default_human_review

## rel|bennett-fracture|treated_by|bennett-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** bennett-fracture -[treated_by]-> bennett-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|bennett-fracture|treated_by|bennett-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## rel|bennett-fracture-key-imaging-finding|indicates_treatment|bennett-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** bennett-fracture-key-imaging-finding -[indicates_treatment]-> bennett-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: bennett-fracture-key-imaging-finding -[indicates_treatment]-> bennett-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-bennett-fracture-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-bennett-fracture-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-bennett-fracture-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-bennett-fracture-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-bennett-fracture-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-bennett-fracture-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-bennett-fracture-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-bennett-fracture-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-bennett-fracture-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-bennett-fracture-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-bennett-fracture-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-bennett-fracture-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-bennett-fracture-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-bennett-fracture-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-bennett-fracture-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-bennett-fracture-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

