# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:03:27.177Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 83

Everything else was classified and justified by the first-pass curator.

## rel|proximal-biceps-tendon-pathology|tested_by|proximal-biceps-tendon-pathology-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** proximal-biceps-tendon-pathology -[tested_by]-> proximal-biceps-tendon-pathology-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|proximal-biceps-tendon-pathology|tested_by|proximal-biceps-tendon-pathology-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|proximal-biceps-tendon-pathology-mri-finding|indicates_treatment|proximal-biceps-tendon-pathology-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** proximal-biceps-tendon-pathology-mri-finding -[indicates_treatment]-> proximal-biceps-tendon-pathology-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: proximal-biceps-tendon-pathology-mri-finding -[indicates_treatment]-> proximal-biceps-tendon-pathology-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|proximal-biceps-tendon-pathology|treated_by|proximal-biceps-tendon-pathology-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** proximal-biceps-tendon-pathology -[treated_by]-> proximal-biceps-tendon-pathology-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|proximal-biceps-tendon-pathology|treated_by|proximal-biceps-tendon-pathology-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|proximal-biceps-tendon-pathology|treated_by|proximal-biceps-tendon-pathology-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** proximal-biceps-tendon-pathology -[treated_by]-> proximal-biceps-tendon-pathology-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|proximal-biceps-tendon-pathology|treated_by|proximal-biceps-tendon-pathology-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|proximal-biceps-tendon-pathology|differential_for|rotator-cuff-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** proximal-biceps-tendon-pathology -[differential_for]-> rotator-cuff-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|proximal-biceps-tendon-pathology|differential_for|rotator-cuff-tear

**Rationale:**
- Rule: default_human_review

## rel|proximal-biceps-tendon-pathology|differential_for|slap-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** proximal-biceps-tendon-pathology -[differential_for]-> slap-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|proximal-biceps-tendon-pathology|differential_for|slap-tear

**Rationale:**
- Rule: default_human_review

## rel|proximal-biceps-tendon-pathology|differential_for|proximal-humerus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** proximal-biceps-tendon-pathology -[differential_for]-> proximal-humerus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|proximal-biceps-tendon-pathology|differential_for|proximal-humerus-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-proximalbicepstendonpathology-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-proximalbicepstendonpathology-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-proximalbicepstendonpathology-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-proximalbicepstendonpathology-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-proximalbicepstendonpathology-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-proximalbicepstendonpathology-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-proximalbicepstendonpathology-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-proximalbicepstendonpathology-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-proximalbicepstendonpathology-popeye

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-proximalbicepstendonpathology-popeye

**Rationale:**
- Rule: l1_management_fact

## dp|dp-proximalbicepstendonpathology-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-proximalbicepstendonpathology-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-proximalbicepstendonpathology-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-proximalbicepstendonpathology-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

