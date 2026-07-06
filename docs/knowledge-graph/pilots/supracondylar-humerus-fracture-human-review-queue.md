# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:52:19.351Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 64

Everything else was classified and justified by the first-pass curator.

## rel|supracondylar-humerus-fracture|at_risk_structure|brachial-artery

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** supracondylar-humerus-fracture -[at_risk_structure]-> brachial-artery
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|supracondylar-humerus-fracture|at_risk_structure|brachial-artery

**Rationale:**
- Rule: high_risk_predicate

## rel|supracondylar-humerus-fracture|at_risk_structure|anterior-interosseous-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** supracondylar-humerus-fracture -[at_risk_structure]-> anterior-interosseous-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|supracondylar-humerus-fracture|at_risk_structure|anterior-interosseous-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|supracondylar-humerus-fracture|at_risk_structure|median-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** supracondylar-humerus-fracture -[at_risk_structure]-> median-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|supracondylar-humerus-fracture|at_risk_structure|median-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|supracondylar-humerus-fracture|at_risk_structure|radial-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** supracondylar-humerus-fracture -[at_risk_structure]-> radial-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|supracondylar-humerus-fracture|at_risk_structure|radial-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|extension-type-supracondylar-fracture|indicates_treatment|supracondylar-percutaneous-pinning

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** extension-type-supracondylar-fracture -[indicates_treatment]-> supracondylar-percutaneous-pinning
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: extension-type-supracondylar-fracture -[indicates_treatment]-> supracondylar-percutaneous-pinning

**Rationale:**
- Rule: high_risk_predicate

## rel|pulseless-supracondylar-hand|indicates_treatment|supracondylar-percutaneous-pinning

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pulseless-supracondylar-hand -[indicates_treatment]-> supracondylar-percutaneous-pinning
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: pulseless-supracondylar-hand -[indicates_treatment]-> supracondylar-percutaneous-pinning

**Rationale:**
- Rule: high_risk_predicate

## rel|supracondylar-humerus-fracture|treated_by|supracondylar-percutaneous-pinning

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** supracondylar-humerus-fracture -[treated_by]-> supracondylar-percutaneous-pinning
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|supracondylar-humerus-fracture|treated_by|supracondylar-percutaneous-pinning

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-sc-nv-urgency

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sc-nv-urgency

**Rationale:**
- Rule: l1_management_fact

## claim|claim-sc-pulseless-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sc-pulseless-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-sc-fat-pad-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sc-fat-pad-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-sc-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sc-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-sc-urgent-pinning

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-sc-urgent-pinning

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-sc-pulseless-vascular

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-sc-pulseless-vascular

**Rationale:**
- Rule: decision_point_requires_attending

