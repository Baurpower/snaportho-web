# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:55:54.407Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 163

Everything else was classified and justified by the first-pass curator.

## rel|galeazzi-fracture|differential_for|distal-radius-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** galeazzi-fracture -[differential_for]-> distal-radius-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|galeazzi-fracture|differential_for|distal-radius-fracture

**Rationale:**
- Rule: default_human_review

## rel|galeazzi-fracture|differential_for|druj-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** galeazzi-fracture -[differential_for]-> druj-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|galeazzi-fracture|differential_for|druj-instability

**Rationale:**
- Rule: default_human_review

## rel|galeazzi-fracture|differential_for|essex-lopresti-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** galeazzi-fracture -[differential_for]-> essex-lopresti-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|galeazzi-fracture|differential_for|essex-lopresti-injury

**Rationale:**
- Rule: default_human_review

## rel|galeazzi-fracture|treated_by|galeazzi-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** galeazzi-fracture -[treated_by]-> galeazzi-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|galeazzi-fracture|treated_by|galeazzi-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## rel|galeazzi-fracture-key-imaging-finding|indicates_treatment|galeazzi-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** galeazzi-fracture-key-imaging-finding -[indicates_treatment]-> galeazzi-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: galeazzi-fracture-key-imaging-finding -[indicates_treatment]-> galeazzi-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-galeazzi-fracture-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-galeazzi-fracture-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-galeazzi-fracture-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-galeazzi-fracture-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-galeazzi-fracture-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-galeazzi-fracture-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-galeazzi-fracture-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-galeazzi-fracture-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-galeazzi-fracture-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-galeazzi-fracture-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-galeazzi-fracture-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-galeazzi-fracture-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-galeazzi-fracture-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-galeazzi-fracture-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-galeazzi-fracture-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-galeazzi-fracture-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

