# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:41:16.170Z

**Items requiring human judgment:** 19
**Auto-curated (low-risk):** 176

Everything else was classified and justified by the first-pass curator.

## rel|distal-radius-fracture|at_risk_structure|median-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-radius-fracture -[at_risk_structure]-> median-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-fracture|at_risk_structure|median-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-radius-fracture|differential_for|druj-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-radius-fracture -[differential_for]-> druj-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-fracture|differential_for|druj-instability

**Rationale:**
- Rule: default_human_review

## rel|distal-radius-fracture|differential_for|galeazzi-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-radius-fracture -[differential_for]-> galeazzi-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-fracture|differential_for|galeazzi-fracture

**Rationale:**
- Rule: default_human_review

## rel|distal-radius-fracture|differential_for|essex-lopresti-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-radius-fracture -[differential_for]-> essex-lopresti-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-fracture|differential_for|essex-lopresti-injury

**Rationale:**
- Rule: default_human_review

## rel|distal-radius-fracture|differential_for|carpal-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-radius-fracture -[differential_for]-> carpal-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-fracture|differential_for|carpal-instability

**Rationale:**
- Rule: default_human_review

## rel|dorsal-comminution|indicates_treatment|distal-radius-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** dorsal-comminution -[indicates_treatment]-> distal-radius-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: dorsal-comminution -[indicates_treatment]-> distal-radius-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|radial-height-loss|indicates_treatment|distal-radius-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** radial-height-loss -[indicates_treatment]-> distal-radius-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: radial-height-loss -[indicates_treatment]-> distal-radius-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-radius-fracture|uses_fixation|distal-radius-orif-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-radius-fracture -[uses_fixation]-> distal-radius-orif-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-fracture|uses_fixation|distal-radius-orif-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-radius-fracture|treated_by|distal-radius-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-radius-fracture -[treated_by]-> distal-radius-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-fracture|treated_by|distal-radius-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-radius-orif|uses_approach|volar-approach

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-radius-orif -[uses_approach]-> volar-approach
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-orif|uses_approach|volar-approach

**Rationale:**
- Rule: default_human_review

## rel|distal-radius-orif|at_risk_structure|median-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-radius-orif -[at_risk_structure]-> median-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-radius-orif|at_risk_structure|median-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|druj|explains_instability|distal-radius-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** druj -[explains_instability]-> distal-radius-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|druj|explains_instability|distal-radius-fracture

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-dr-mechanism-nv

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dr-mechanism-nv

**Rationale:**
- Rule: l1_management_fact

## claim|claim-dr-druj-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dr-druj-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-dr-dorsal-comminution

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dr-dorsal-comminution

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-dr-malalignment-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dr-malalignment-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-dr-splint-plan

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dr-splint-plan

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-dr-operative-fixation

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-dr-operative-fixation

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-dr-nonoperative-cast

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-dr-nonoperative-cast

**Rationale:**
- Rule: decision_point_requires_attending

