# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:35:40.765Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 163

Everything else was classified and justified by the first-pass curator.

## rel|sl-ligament-injury|differential_for|carpal-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** sl-ligament-injury -[differential_for]-> carpal-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|sl-ligament-injury|differential_for|carpal-instability

**Rationale:**
- Rule: default_human_review

## rel|sl-ligament-injury|differential_for|scaphoid-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** sl-ligament-injury -[differential_for]-> scaphoid-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|sl-ligament-injury|differential_for|scaphoid-fracture

**Rationale:**
- Rule: default_human_review

## rel|sl-ligament-injury|differential_for|perilunate-dislocation

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** sl-ligament-injury -[differential_for]-> perilunate-dislocation
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|sl-ligament-injury|differential_for|perilunate-dislocation

**Rationale:**
- Rule: default_human_review

## rel|sl-ligament-injury|treated_by|sl-ligament-injury-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** sl-ligament-injury -[treated_by]-> sl-ligament-injury-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|sl-ligament-injury|treated_by|sl-ligament-injury-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## rel|sl-ligament-injury-key-imaging-finding|indicates_treatment|sl-ligament-injury-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** sl-ligament-injury-key-imaging-finding -[indicates_treatment]-> sl-ligament-injury-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: sl-ligament-injury-key-imaging-finding -[indicates_treatment]-> sl-ligament-injury-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-sl-ligament-injury-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sl-ligament-injury-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-sl-ligament-injury-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sl-ligament-injury-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-sl-ligament-injury-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sl-ligament-injury-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-sl-ligament-injury-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sl-ligament-injury-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-sl-ligament-injury-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sl-ligament-injury-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-sl-ligament-injury-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-sl-ligament-injury-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-sl-ligament-injury-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-sl-ligament-injury-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-sl-ligament-injury-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-sl-ligament-injury-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

