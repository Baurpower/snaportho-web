# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:27:57.861Z

**Items requiring human judgment:** 12
**Auto-curated (low-risk):** 162

Everything else was classified and justified by the first-pass curator.

## rel|lunate-dislocation|differential_for|perilunate-dislocation

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** lunate-dislocation -[differential_for]-> perilunate-dislocation
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|lunate-dislocation|differential_for|perilunate-dislocation

**Rationale:**
- Rule: default_human_review

## rel|lunate-dislocation|differential_for|carpal-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** lunate-dislocation -[differential_for]-> carpal-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|lunate-dislocation|differential_for|carpal-instability

**Rationale:**
- Rule: default_human_review

## rel|lunate-dislocation|differential_for|carpal-tunnel-syndrome

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** lunate-dislocation -[differential_for]-> carpal-tunnel-syndrome
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|lunate-dislocation|differential_for|carpal-tunnel-syndrome

**Rationale:**
- Rule: default_human_review

## rel|lunate-dislocation|treated_by|lunate-dislocation-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** lunate-dislocation -[treated_by]-> lunate-dislocation-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|lunate-dislocation|treated_by|lunate-dislocation-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-lunate-dislocation-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lunate-dislocation-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-lunate-dislocation-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lunate-dislocation-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-lunate-dislocation-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lunate-dislocation-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-lunate-dislocation-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lunate-dislocation-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-lunate-dislocation-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lunate-dislocation-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-lunate-dislocation-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lunate-dislocation-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-lunate-dislocation-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-lunate-dislocation-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-lunate-dislocation-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-lunate-dislocation-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

