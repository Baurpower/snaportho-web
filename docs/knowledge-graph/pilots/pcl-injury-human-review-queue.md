# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:40:33.660Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 83

Everything else was classified and justified by the first-pass curator.

## rel|pcl-injury|tested_by|pcl-injury-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** pcl-injury -[tested_by]-> pcl-injury-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|pcl-injury|tested_by|pcl-injury-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|pcl-injury-mri-finding|indicates_treatment|pcl-injury-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pcl-injury-mri-finding -[indicates_treatment]-> pcl-injury-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: pcl-injury-mri-finding -[indicates_treatment]-> pcl-injury-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|pcl-injury|treated_by|pcl-injury-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pcl-injury -[treated_by]-> pcl-injury-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|pcl-injury|treated_by|pcl-injury-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|pcl-injury|treated_by|pcl-injury-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pcl-injury -[treated_by]-> pcl-injury-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|pcl-injury|treated_by|pcl-injury-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|pcl-injury|differential_for|acl-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** pcl-injury -[differential_for]-> acl-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|pcl-injury|differential_for|acl-tear

**Rationale:**
- Rule: default_human_review

## rel|pcl-injury|differential_for|multiligament-knee-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** pcl-injury -[differential_for]-> multiligament-knee-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|pcl-injury|differential_for|multiligament-knee-injury

**Rationale:**
- Rule: default_human_review

## rel|pcl-injury|differential_for|tibial-plateau-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** pcl-injury -[differential_for]-> tibial-plateau-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|pcl-injury|differential_for|tibial-plateau-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-pclinjury-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pclinjury-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-pclinjury-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pclinjury-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pclinjury-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pclinjury-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pclinjury-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pclinjury-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pclinjury-sag-sign

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pclinjury-sag-sign

**Rationale:**
- Rule: l1_management_fact

## dp|dp-pclinjury-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pclinjury-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-pclinjury-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pclinjury-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

