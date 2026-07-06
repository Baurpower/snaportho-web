# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:30:00.957Z

**Items requiring human judgment:** 12
**Auto-curated (low-risk):** 65

Everything else was classified and justified by the first-pass curator.

## rel|pelvic-ring-injury|at_risk_structure|pelvis

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pelvic-ring-injury -[at_risk_structure]-> pelvis
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|pelvic-ring-injury|at_risk_structure|pelvis

**Rationale:**
- Rule: high_risk_predicate

## rel|unstable-pelvic-ring-pattern|indicates_treatment|pelvic-binder-application

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** unstable-pelvic-ring-pattern -[indicates_treatment]-> pelvic-binder-application
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: unstable-pelvic-ring-pattern -[indicates_treatment]-> pelvic-binder-application

**Rationale:**
- Rule: high_risk_predicate

## rel|unstable-pelvic-ring-pattern|indicates_treatment|pelvic-external-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** unstable-pelvic-ring-pattern -[indicates_treatment]-> pelvic-external-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: unstable-pelvic-ring-pattern -[indicates_treatment]-> pelvic-external-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|pelvic-ring-injury|treated_by|pelvic-binder-application

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pelvic-ring-injury -[treated_by]-> pelvic-binder-application
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|pelvic-ring-injury|treated_by|pelvic-binder-application

**Rationale:**
- Rule: high_risk_predicate

## rel|pelvic-ring-injury|treated_by|pelvic-external-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pelvic-ring-injury -[treated_by]-> pelvic-external-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|pelvic-ring-injury|treated_by|pelvic-external-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|unstable-pelvic-ring-pattern|explains_instability|pelvic-ring-injury

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** unstable-pelvic-ring-pattern -[explains_instability]-> pelvic-ring-injury
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|unstable-pelvic-ring-pattern|explains_instability|pelvic-ring-injury

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-pri-ring-instability

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pri-ring-instability

**Rationale:**
- Rule: l1_management_fact

## claim|claim-pri-binder-not-definitive

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pri-binder-not-definitive

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pri-missed-posterior-ring

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pri-missed-posterior-ring

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pri-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pri-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-pri-unstable-ring-stabilization

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pri-unstable-ring-stabilization

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-pri-hemorrhage-control

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pri-hemorrhage-control

**Rationale:**
- Rule: decision_point_requires_attending

