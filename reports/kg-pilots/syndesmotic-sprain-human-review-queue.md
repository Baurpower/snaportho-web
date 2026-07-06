# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:17:42.452Z

**Items requiring human judgment:** 15
**Auto-curated (low-risk):** 82

Everything else was classified and justified by the first-pass curator.

## rel|syndesmotic-sprain|tested_by|syndesmotic-sprain-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** syndesmotic-sprain -[tested_by]-> syndesmotic-sprain-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|syndesmotic-sprain|tested_by|syndesmotic-sprain-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|syndesmotic-sprain-mri-finding|indicates_treatment|syndesmotic-sprain-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** syndesmotic-sprain-mri-finding -[indicates_treatment]-> syndesmotic-sprain-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: syndesmotic-sprain-mri-finding -[indicates_treatment]-> syndesmotic-sprain-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|syndesmotic-sprain|treated_by|syndesmotic-sprain-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** syndesmotic-sprain -[treated_by]-> syndesmotic-sprain-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|syndesmotic-sprain|treated_by|syndesmotic-sprain-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|syndesmotic-sprain|treated_by|syndesmotic-sprain-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** syndesmotic-sprain -[treated_by]-> syndesmotic-sprain-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|syndesmotic-sprain|treated_by|syndesmotic-sprain-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|syndesmotic-sprain|differential_for|chronic-lateral-ankle-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** syndesmotic-sprain -[differential_for]-> chronic-lateral-ankle-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|syndesmotic-sprain|differential_for|chronic-lateral-ankle-instability

**Rationale:**
- Rule: default_human_review

## rel|syndesmotic-sprain|differential_for|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** syndesmotic-sprain -[differential_for]-> ankle-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|syndesmotic-sprain|differential_for|ankle-fracture

**Rationale:**
- Rule: default_human_review

## rel|syndesmotic-sprain|differential_for|pilon-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** syndesmotic-sprain -[differential_for]-> pilon-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|syndesmotic-sprain|differential_for|pilon-fracture

**Rationale:**
- Rule: default_human_review

## rel|syndesmotic-sprain|differential_for|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** syndesmotic-sprain -[differential_for]-> ankle-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|syndesmotic-sprain|differential_for|ankle-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-syndesmoticsprain-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-syndesmoticsprain-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-syndesmoticsprain-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-syndesmoticsprain-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-syndesmoticsprain-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-syndesmoticsprain-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-syndesmoticsprain-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-syndesmoticsprain-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-syndesmoticsprain-weber-link

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-syndesmoticsprain-weber-link

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-syndesmoticsprain-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-syndesmoticsprain-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-syndesmoticsprain-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-syndesmoticsprain-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

