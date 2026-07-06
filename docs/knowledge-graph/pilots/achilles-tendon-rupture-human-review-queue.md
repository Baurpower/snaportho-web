# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:11:23.422Z

**Items requiring human judgment:** 16
**Auto-curated (low-risk):** 82

Everything else was classified and justified by the first-pass curator.

## rel|achilles-tendon-rupture|tested_by|achilles-tendon-rupture-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** achilles-tendon-rupture -[tested_by]-> achilles-tendon-rupture-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|tested_by|achilles-tendon-rupture-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|achilles-tendon-rupture-mri-finding|indicates_treatment|achilles-tendon-rupture-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** achilles-tendon-rupture-mri-finding -[indicates_treatment]-> achilles-tendon-rupture-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: achilles-tendon-rupture-mri-finding -[indicates_treatment]-> achilles-tendon-rupture-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|achilles-tendon-rupture|treated_by|achilles-tendon-rupture-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** achilles-tendon-rupture -[treated_by]-> achilles-tendon-rupture-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|treated_by|achilles-tendon-rupture-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|achilles-tendon-rupture|treated_by|achilles-tendon-rupture-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** achilles-tendon-rupture -[treated_by]-> achilles-tendon-rupture-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|treated_by|achilles-tendon-rupture-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|achilles-tendon-rupture|differential_for|chronic-lateral-ankle-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** achilles-tendon-rupture -[differential_for]-> chronic-lateral-ankle-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|differential_for|chronic-lateral-ankle-instability

**Rationale:**
- Rule: default_human_review

## rel|achilles-tendon-rupture|differential_for|osteochondral-lesion-talus

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** achilles-tendon-rupture -[differential_for]-> osteochondral-lesion-talus
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|differential_for|osteochondral-lesion-talus

**Rationale:**
- Rule: default_human_review

## rel|achilles-tendon-rupture|differential_for|calcaneus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** achilles-tendon-rupture -[differential_for]-> calcaneus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|differential_for|calcaneus-fracture

**Rationale:**
- Rule: default_human_review

## rel|achilles-tendon-rupture|differential_for|talus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** achilles-tendon-rupture -[differential_for]-> talus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|differential_for|talus-fracture

**Rationale:**
- Rule: default_human_review

## rel|achilles-tendon-rupture|differential_for|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** achilles-tendon-rupture -[differential_for]-> ankle-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|achilles-tendon-rupture|differential_for|ankle-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-achillestendonrupture-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-achillestendonrupture-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-achillestendonrupture-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-achillestendonrupture-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-achillestendonrupture-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-achillestendonrupture-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-achillestendonrupture-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-achillestendonrupture-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-achillestendonrupture-thompson

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-achillestendonrupture-thompson

**Rationale:**
- Rule: l1_management_fact

## dp|dp-achillestendonrupture-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-achillestendonrupture-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-achillestendonrupture-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-achillestendonrupture-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

