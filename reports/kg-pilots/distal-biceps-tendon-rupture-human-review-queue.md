# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:08:27.592Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 80

Everything else was classified and justified by the first-pass curator.

## rel|distal-biceps-tendon-rupture|tested_by|distal-biceps-tendon-rupture-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-biceps-tendon-rupture -[tested_by]-> distal-biceps-tendon-rupture-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-biceps-tendon-rupture|tested_by|distal-biceps-tendon-rupture-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|distal-biceps-tendon-rupture-mri-finding|indicates_treatment|distal-biceps-tendon-rupture-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-biceps-tendon-rupture-mri-finding -[indicates_treatment]-> distal-biceps-tendon-rupture-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: distal-biceps-tendon-rupture-mri-finding -[indicates_treatment]-> distal-biceps-tendon-rupture-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-biceps-tendon-rupture|treated_by|distal-biceps-tendon-rupture-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-biceps-tendon-rupture -[treated_by]-> distal-biceps-tendon-rupture-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-biceps-tendon-rupture|treated_by|distal-biceps-tendon-rupture-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-biceps-tendon-rupture|treated_by|distal-biceps-tendon-rupture-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-biceps-tendon-rupture -[treated_by]-> distal-biceps-tendon-rupture-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-biceps-tendon-rupture|treated_by|distal-biceps-tendon-rupture-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-biceps-tendon-rupture|differential_for|ucl-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-biceps-tendon-rupture -[differential_for]-> ucl-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-biceps-tendon-rupture|differential_for|ucl-injury

**Rationale:**
- Rule: default_human_review

## rel|distal-biceps-tendon-rupture|differential_for|distal-humerus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-biceps-tendon-rupture -[differential_for]-> distal-humerus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-biceps-tendon-rupture|differential_for|distal-humerus-fracture

**Rationale:**
- Rule: default_human_review

## rel|distal-biceps-tendon-rupture|at_risk_structure|radial-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-biceps-tendon-rupture -[at_risk_structure]-> radial-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-biceps-tendon-rupture|at_risk_structure|radial-nerve

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-distalbicepstendonrupture-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distalbicepstendonrupture-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-distalbicepstendonrupture-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distalbicepstendonrupture-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-distalbicepstendonrupture-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distalbicepstendonrupture-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-distalbicepstendonrupture-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distalbicepstendonrupture-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-distalbicepstendonrupture-hook-test

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distalbicepstendonrupture-hook-test

**Rationale:**
- Rule: l1_management_fact

## dp|dp-distalbicepstendonrupture-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-distalbicepstendonrupture-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-distalbicepstendonrupture-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-distalbicepstendonrupture-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

