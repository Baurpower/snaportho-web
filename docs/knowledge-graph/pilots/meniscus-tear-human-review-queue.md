# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:42:58.136Z

**Items requiring human judgment:** 15
**Auto-curated (low-risk):** 85

Everything else was classified and justified by the first-pass curator.

## rel|meniscus-tear|tested_by|meniscus-tear-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** meniscus-tear -[tested_by]-> meniscus-tear-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|meniscus-tear|tested_by|meniscus-tear-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|meniscus-tear-mri-finding|indicates_treatment|meniscus-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** meniscus-tear-mri-finding -[indicates_treatment]-> meniscus-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: meniscus-tear-mri-finding -[indicates_treatment]-> meniscus-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|meniscus-tear|treated_by|meniscus-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** meniscus-tear -[treated_by]-> meniscus-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|meniscus-tear|treated_by|meniscus-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|meniscus-tear|treated_by|meniscus-tear-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** meniscus-tear -[treated_by]-> meniscus-tear-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|meniscus-tear|treated_by|meniscus-tear-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|meniscus-tear|differential_for|acl-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** meniscus-tear -[differential_for]-> acl-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|meniscus-tear|differential_for|acl-tear

**Rationale:**
- Rule: default_human_review

## rel|meniscus-tear|differential_for|osteochondral-defect-knee

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** meniscus-tear -[differential_for]-> osteochondral-defect-knee
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|meniscus-tear|differential_for|osteochondral-defect-knee

**Rationale:**
- Rule: default_human_review

## rel|meniscus-tear|differential_for|tibial-plateau-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** meniscus-tear -[differential_for]-> tibial-plateau-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|meniscus-tear|differential_for|tibial-plateau-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-meniscustear-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-meniscustear-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-meniscustear-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-meniscustear-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-meniscustear-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-meniscustear-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-meniscustear-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-meniscustear-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-meniscustear-repair-zone

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-meniscustear-repair-zone

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-meniscustear-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-meniscustear-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-meniscustear-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-meniscustear-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-meniscustear-locked-knee

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-meniscustear-locked-knee

**Rationale:**
- Rule: decision_point_requires_attending

