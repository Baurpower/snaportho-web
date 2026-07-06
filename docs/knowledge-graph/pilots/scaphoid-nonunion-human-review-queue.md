# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:12:14.422Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 163

Everything else was classified and justified by the first-pass curator.

## rel|scaphoid-nonunion|differential_for|scaphoid-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** scaphoid-nonunion -[differential_for]-> scaphoid-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-nonunion|differential_for|scaphoid-fracture

**Rationale:**
- Rule: default_human_review

## rel|scaphoid-nonunion|differential_for|carpal-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** scaphoid-nonunion -[differential_for]-> carpal-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-nonunion|differential_for|carpal-instability

**Rationale:**
- Rule: default_human_review

## rel|scaphoid-nonunion|differential_for|sl-ligament-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** scaphoid-nonunion -[differential_for]-> sl-ligament-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-nonunion|differential_for|sl-ligament-injury

**Rationale:**
- Rule: default_human_review

## rel|scaphoid-nonunion|treated_by|scaphoid-nonunion-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** scaphoid-nonunion -[treated_by]-> scaphoid-nonunion-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|scaphoid-nonunion|treated_by|scaphoid-nonunion-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## rel|scaphoid-nonunion-key-imaging-finding|indicates_treatment|scaphoid-nonunion-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** scaphoid-nonunion-key-imaging-finding -[indicates_treatment]-> scaphoid-nonunion-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: scaphoid-nonunion-key-imaging-finding -[indicates_treatment]-> scaphoid-nonunion-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-scaphoid-nonunion-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-nonunion-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-scaphoid-nonunion-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-nonunion-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-nonunion-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-nonunion-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-nonunion-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-nonunion-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-nonunion-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-nonunion-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-scaphoid-nonunion-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-scaphoid-nonunion-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-scaphoid-nonunion-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-scaphoid-nonunion-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-scaphoid-nonunion-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-scaphoid-nonunion-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

