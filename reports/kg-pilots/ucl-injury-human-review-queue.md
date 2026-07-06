# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:06:09.574Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 80

Everything else was classified and justified by the first-pass curator.

## rel|ucl-injury|tested_by|ucl-injury-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ucl-injury -[tested_by]-> ucl-injury-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ucl-injury|tested_by|ucl-injury-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|ucl-injury-mri-finding|indicates_treatment|ucl-injury-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ucl-injury-mri-finding -[indicates_treatment]-> ucl-injury-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: ucl-injury-mri-finding -[indicates_treatment]-> ucl-injury-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|ucl-injury|treated_by|ucl-injury-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ucl-injury -[treated_by]-> ucl-injury-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ucl-injury|treated_by|ucl-injury-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|ucl-injury|treated_by|ucl-injury-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ucl-injury -[treated_by]-> ucl-injury-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ucl-injury|treated_by|ucl-injury-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|ucl-injury|differential_for|distal-biceps-tendon-rupture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ucl-injury -[differential_for]-> distal-biceps-tendon-rupture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ucl-injury|differential_for|distal-biceps-tendon-rupture

**Rationale:**
- Rule: default_human_review

## rel|ucl-injury|differential_for|distal-humerus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** ucl-injury -[differential_for]-> distal-humerus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|ucl-injury|differential_for|distal-humerus-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-uclinjury-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-uclinjury-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-uclinjury-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-uclinjury-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-uclinjury-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-uclinjury-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-uclinjury-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-uclinjury-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-uclinjury-valgus

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-uclinjury-valgus

**Rationale:**
- Rule: l1_management_fact

## dp|dp-uclinjury-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-uclinjury-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-uclinjury-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-uclinjury-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-uclinjury-tommy-john

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-uclinjury-tommy-john

**Rationale:**
- Rule: decision_point_requires_attending

