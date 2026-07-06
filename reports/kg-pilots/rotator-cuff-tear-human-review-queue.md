# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:55:11.193Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 84

Everything else was classified and justified by the first-pass curator.

## rel|rotator-cuff-tear|tested_by|rotator-cuff-tear-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** rotator-cuff-tear -[tested_by]-> rotator-cuff-tear-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|rotator-cuff-tear|tested_by|rotator-cuff-tear-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|rotator-cuff-tear-mri-finding|indicates_treatment|rotator-cuff-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** rotator-cuff-tear-mri-finding -[indicates_treatment]-> rotator-cuff-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: rotator-cuff-tear-mri-finding -[indicates_treatment]-> rotator-cuff-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|rotator-cuff-tear|treated_by|rotator-cuff-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** rotator-cuff-tear -[treated_by]-> rotator-cuff-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|rotator-cuff-tear|treated_by|rotator-cuff-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|rotator-cuff-tear|treated_by|rotator-cuff-tear-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** rotator-cuff-tear -[treated_by]-> rotator-cuff-tear-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|rotator-cuff-tear|treated_by|rotator-cuff-tear-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|rotator-cuff-tear|differential_for|anterior-shoulder-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** rotator-cuff-tear -[differential_for]-> anterior-shoulder-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|rotator-cuff-tear|differential_for|anterior-shoulder-instability

**Rationale:**
- Rule: default_human_review

## rel|rotator-cuff-tear|differential_for|proximal-biceps-tendon-pathology

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** rotator-cuff-tear -[differential_for]-> proximal-biceps-tendon-pathology
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|rotator-cuff-tear|differential_for|proximal-biceps-tendon-pathology

**Rationale:**
- Rule: default_human_review

## rel|rotator-cuff-tear|differential_for|proximal-humerus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** rotator-cuff-tear -[differential_for]-> proximal-humerus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|rotator-cuff-tear|differential_for|proximal-humerus-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-rotatorcufftear-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rotatorcufftear-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-rotatorcufftear-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rotatorcufftear-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-rotatorcufftear-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rotatorcufftear-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-rotatorcufftear-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rotatorcufftear-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-rotatorcufftear-pseudoparalysis

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-rotatorcufftear-pseudoparalysis

**Rationale:**
- Rule: l1_management_fact

## dp|dp-rotatorcufftear-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-rotatorcufftear-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-rotatorcufftear-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-rotatorcufftear-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

