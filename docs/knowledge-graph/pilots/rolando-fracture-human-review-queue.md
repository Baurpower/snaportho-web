# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:52:55.185Z

**Items requiring human judgment:** 12
**Auto-curated (low-risk):** 162

Everything else was classified and justified by the first-pass curator.

## rel|rolando-fracture|differential_for|bennett-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** rolando-fracture -[differential_for]-> bennett-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|rolando-fracture|differential_for|bennett-fracture

**Rationale:**
- Rule: default_human_review

## rel|rolando-fracture|differential_for|thumb-ucl-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** rolando-fracture -[differential_for]-> thumb-ucl-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|rolando-fracture|differential_for|thumb-ucl-injury

**Rationale:**
- Rule: default_human_review

## rel|rolando-fracture|treated_by|rolando-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** rolando-fracture -[treated_by]-> rolando-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|rolando-fracture|treated_by|rolando-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## rel|rolando-fracture-key-imaging-finding|indicates_treatment|rolando-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** rolando-fracture-key-imaging-finding -[indicates_treatment]-> rolando-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: rolando-fracture-key-imaging-finding -[indicates_treatment]-> rolando-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-rolando-fracture-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rolando-fracture-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-rolando-fracture-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rolando-fracture-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-rolando-fracture-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rolando-fracture-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-rolando-fracture-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rolando-fracture-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-rolando-fracture-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rolando-fracture-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-rolando-fracture-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rolando-fracture-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-rolando-fracture-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-rolando-fracture-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-rolando-fracture-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-rolando-fracture-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

