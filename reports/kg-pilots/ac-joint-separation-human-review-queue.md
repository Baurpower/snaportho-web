# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:58:49.250Z

**Items requiring human judgment:** 15
**Auto-curated (low-risk):** 83

Everything else was classified and justified by the first-pass curator.

## rel|ac-joint-separation|tested_by|ac-joint-separation-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ac-joint-separation -[tested_by]-> ac-joint-separation-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ac-joint-separation|tested_by|ac-joint-separation-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|ac-joint-separation-mri-finding|indicates_treatment|ac-joint-separation-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ac-joint-separation-mri-finding -[indicates_treatment]-> ac-joint-separation-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: ac-joint-separation-mri-finding -[indicates_treatment]-> ac-joint-separation-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|ac-joint-separation|treated_by|ac-joint-separation-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ac-joint-separation -[treated_by]-> ac-joint-separation-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ac-joint-separation|treated_by|ac-joint-separation-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|ac-joint-separation|treated_by|ac-joint-separation-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ac-joint-separation -[treated_by]-> ac-joint-separation-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ac-joint-separation|treated_by|ac-joint-separation-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|ac-joint-separation|differential_for|anterior-shoulder-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ac-joint-separation -[differential_for]-> anterior-shoulder-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ac-joint-separation|differential_for|anterior-shoulder-instability

**Rationale:**
- Rule: default_human_review

## rel|ac-joint-separation|differential_for|rotator-cuff-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ac-joint-separation -[differential_for]-> rotator-cuff-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ac-joint-separation|differential_for|rotator-cuff-tear

**Rationale:**
- Rule: default_human_review

## rel|ac-joint-separation|differential_for|clavicle-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ac-joint-separation -[differential_for]-> clavicle-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ac-joint-separation|differential_for|clavicle-fracture

**Rationale:**
- Rule: default_human_review

## rel|ac-joint-separation|differential_for|proximal-humerus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ac-joint-separation -[differential_for]-> proximal-humerus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ac-joint-separation|differential_for|proximal-humerus-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-acjointseparation-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acjointseparation-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-acjointseparation-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acjointseparation-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acjointseparation-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acjointseparation-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acjointseparation-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acjointseparation-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acjointseparation-rockwood

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acjointseparation-rockwood

**Rationale:**
- Rule: l1_management_fact

## dp|dp-acjointseparation-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-acjointseparation-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-acjointseparation-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-acjointseparation-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

