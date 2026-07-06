# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:47:39.827Z

**Items requiring human judgment:** 18
**Auto-curated (low-risk):** 88

Everything else was classified and justified by the first-pass curator.

## rel|multiligament-knee-injury|tested_by|multiligament-knee-injury-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** multiligament-knee-injury -[tested_by]-> multiligament-knee-injury-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|tested_by|multiligament-knee-injury-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|multiligament-knee-injury-mri-finding|indicates_treatment|multiligament-knee-injury-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** multiligament-knee-injury-mri-finding -[indicates_treatment]-> multiligament-knee-injury-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: multiligament-knee-injury-mri-finding -[indicates_treatment]-> multiligament-knee-injury-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|multiligament-knee-injury|treated_by|multiligament-knee-injury-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** multiligament-knee-injury -[treated_by]-> multiligament-knee-injury-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|treated_by|multiligament-knee-injury-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|multiligament-knee-injury|treated_by|multiligament-knee-injury-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** multiligament-knee-injury -[treated_by]-> multiligament-knee-injury-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|treated_by|multiligament-knee-injury-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|multiligament-knee-injury|differential_for|acl-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** multiligament-knee-injury -[differential_for]-> acl-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|differential_for|acl-tear

**Rationale:**
- Rule: default_human_review

## rel|multiligament-knee-injury|differential_for|pcl-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** multiligament-knee-injury -[differential_for]-> pcl-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|differential_for|pcl-injury

**Rationale:**
- Rule: default_human_review

## rel|multiligament-knee-injury|differential_for|tibial-plateau-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** multiligament-knee-injury -[differential_for]-> tibial-plateau-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|differential_for|tibial-plateau-fracture

**Rationale:**
- Rule: default_human_review

## rel|multiligament-knee-injury|differential_for|distal-femur-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** multiligament-knee-injury -[differential_for]-> distal-femur-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|differential_for|distal-femur-fracture

**Rationale:**
- Rule: default_human_review

## rel|multiligament-knee-injury|at_risk_structure|popliteal-artery

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** multiligament-knee-injury -[at_risk_structure]-> popliteal-artery
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|at_risk_structure|popliteal-artery

**Rationale:**
- Rule: high_risk_predicate

## rel|multiligament-knee-injury|at_risk_structure|common-peroneal-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** multiligament-knee-injury -[at_risk_structure]-> common-peroneal-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|multiligament-knee-injury|at_risk_structure|common-peroneal-nerve

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-multiligamentkneeinjury-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-multiligamentkneeinjury-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-multiligamentkneeinjury-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-multiligamentkneeinjury-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-multiligamentkneeinjury-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-multiligamentkneeinjury-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-multiligamentkneeinjury-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-multiligamentkneeinjury-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-multiligamentkneeinjury-vascular

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-multiligamentkneeinjury-vascular

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-multiligamentkneeinjury-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-multiligamentkneeinjury-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-multiligamentkneeinjury-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-multiligamentkneeinjury-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-multiligamentkneeinjury-vascular-emergency

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-multiligamentkneeinjury-vascular-emergency

**Rationale:**
- Rule: decision_point_requires_attending

