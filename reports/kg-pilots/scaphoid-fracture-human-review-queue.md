# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:07:40.006Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 167

Everything else was classified and justified by the first-pass curator.

## rel|scaphoid-fracture|differential_for|scaphoid-nonunion

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** scaphoid-fracture -[differential_for]-> scaphoid-nonunion
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-fracture|differential_for|scaphoid-nonunion

**Rationale:**
- Rule: default_human_review

## rel|scaphoid-fracture|differential_for|perilunate-dislocation

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** scaphoid-fracture -[differential_for]-> perilunate-dislocation
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-fracture|differential_for|perilunate-dislocation

**Rationale:**
- Rule: default_human_review

## rel|scaphoid-fracture|differential_for|sl-ligament-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** scaphoid-fracture -[differential_for]-> sl-ligament-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-fracture|differential_for|sl-ligament-injury

**Rationale:**
- Rule: default_human_review

## rel|scaphoid-fracture|differential_for|carpal-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** scaphoid-fracture -[differential_for]-> carpal-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-fracture|differential_for|carpal-instability

**Rationale:**
- Rule: default_human_review

## rel|scaphoid-fracture|treated_by|scaphoid-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** scaphoid-fracture -[treated_by]-> scaphoid-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-fracture|treated_by|scaphoid-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## rel|scaphoid-fracture-key-imaging-finding|indicates_treatment|scaphoid-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** scaphoid-fracture-key-imaging-finding -[indicates_treatment]-> scaphoid-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: scaphoid-fracture-key-imaging-finding -[indicates_treatment]-> scaphoid-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-scaphoid-fracture-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-fracture-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-scaphoid-fracture-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-fracture-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-fracture-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-fracture-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-fracture-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-fracture-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-fracture-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-fracture-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-fracture-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-fracture-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-scaphoid-fracture-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-scaphoid-fracture-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-scaphoid-fracture-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-scaphoid-fracture-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

