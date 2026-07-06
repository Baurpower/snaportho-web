# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:52:01.727Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 165

Everything else was classified and justified by the first-pass curator.

## rel|druj-instability|differential_for|distal-radius-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** druj-instability -[differential_for]-> distal-radius-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|druj-instability|differential_for|distal-radius-fracture

**Rationale:**
- Rule: default_human_review

## rel|druj-instability|differential_for|galeazzi-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** druj-instability -[differential_for]-> galeazzi-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|druj-instability|differential_for|galeazzi-fracture

**Rationale:**
- Rule: default_human_review

## rel|druj-instability|differential_for|essex-lopresti-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** druj-instability -[differential_for]-> essex-lopresti-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|druj-instability|differential_for|essex-lopresti-injury

**Rationale:**
- Rule: default_human_review

## rel|druj-instability|differential_for|tfcc-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** druj-instability -[differential_for]-> tfcc-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|druj-instability|differential_for|tfcc-injury

**Rationale:**
- Rule: default_human_review

## rel|druj-instability|treated_by|druj-instability-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** druj-instability -[treated_by]-> druj-instability-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|druj-instability|treated_by|druj-instability-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-druj-instability-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-druj-instability-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-druj-instability-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-druj-instability-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-druj-instability-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-druj-instability-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-druj-instability-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-druj-instability-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-druj-instability-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-druj-instability-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-druj-instability-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-druj-instability-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-druj-instability-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-druj-instability-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-druj-instability-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-druj-instability-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

