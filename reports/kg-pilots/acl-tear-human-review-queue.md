# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:38:05.392Z

**Items requiring human judgment:** 18
**Auto-curated (low-risk):** 86

Everything else was classified and justified by the first-pass curator.

## rel|acl-tear|tested_by|acl-tear-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** acl-tear -[tested_by]-> acl-tear-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|acl-tear|tested_by|acl-tear-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|acl-tear-mri-finding|indicates_treatment|acl-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** acl-tear-mri-finding -[indicates_treatment]-> acl-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: acl-tear-mri-finding -[indicates_treatment]-> acl-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|acl-tear|treated_by|acl-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** acl-tear -[treated_by]-> acl-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|acl-tear|treated_by|acl-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|acl-tear|treated_by|acl-tear-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** acl-tear -[treated_by]-> acl-tear-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|acl-tear|treated_by|acl-tear-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|acl-tear|differential_for|meniscus-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** acl-tear -[differential_for]-> meniscus-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|acl-tear|differential_for|meniscus-tear

**Rationale:**
- Rule: default_human_review

## rel|acl-tear|differential_for|patellar-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** acl-tear -[differential_for]-> patellar-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|acl-tear|differential_for|patellar-instability

**Rationale:**
- Rule: default_human_review

## rel|acl-tear|differential_for|multiligament-knee-injury

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** acl-tear -[differential_for]-> multiligament-knee-injury
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|acl-tear|differential_for|multiligament-knee-injury

**Rationale:**
- Rule: default_human_review

## rel|acl-tear|differential_for|tibial-plateau-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** acl-tear -[differential_for]-> tibial-plateau-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|acl-tear|differential_for|tibial-plateau-fracture

**Rationale:**
- Rule: default_human_review

## rel|acl-tear-exam-maneuver|examines|acl

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** acl-tear-exam-maneuver -[examines]-> acl
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|acl-tear-exam-maneuver|examines|acl

**Rationale:**
- Rule: default_human_review

## claim|claim-acltear-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acltear-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-acltear-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acltear-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acltear-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acltear-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acltear-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acltear-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acltear-lachman

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acltear-lachman

**Rationale:**
- Rule: l1_management_fact

## claim|claim-acltear-bone-bruise

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acltear-bone-bruise

**Rationale:**
- Rule: l1_management_fact

## dp|dp-acltear-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-acltear-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-acltear-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-acltear-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-acltear-prehab

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-acltear-prehab

**Rationale:**
- Rule: decision_point_requires_attending

