# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:50:05.536Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 83

Everything else was classified and justified by the first-pass curator.

## rel|osteochondral-defect-knee|tested_by|osteochondral-defect-knee-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-defect-knee -[tested_by]-> osteochondral-defect-knee-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-defect-knee|tested_by|osteochondral-defect-knee-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|osteochondral-defect-knee-mri-finding|indicates_treatment|osteochondral-defect-knee-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** osteochondral-defect-knee-mri-finding -[indicates_treatment]-> osteochondral-defect-knee-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: osteochondral-defect-knee-mri-finding -[indicates_treatment]-> osteochondral-defect-knee-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|osteochondral-defect-knee|treated_by|osteochondral-defect-knee-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** osteochondral-defect-knee -[treated_by]-> osteochondral-defect-knee-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-defect-knee|treated_by|osteochondral-defect-knee-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|osteochondral-defect-knee|treated_by|osteochondral-defect-knee-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** osteochondral-defect-knee -[treated_by]-> osteochondral-defect-knee-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-defect-knee|treated_by|osteochondral-defect-knee-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|osteochondral-defect-knee|differential_for|meniscus-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-defect-knee -[differential_for]-> meniscus-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-defect-knee|differential_for|meniscus-tear

**Rationale:**
- Rule: default_human_review

## rel|osteochondral-defect-knee|differential_for|patellar-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-defect-knee -[differential_for]-> patellar-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-defect-knee|differential_for|patellar-instability

**Rationale:**
- Rule: default_human_review

## rel|osteochondral-defect-knee|differential_for|tibial-plateau-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-defect-knee -[differential_for]-> tibial-plateau-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-defect-knee|differential_for|tibial-plateau-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-osteochondraldefectknee-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondraldefectknee-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-osteochondraldefectknee-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondraldefectknee-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-osteochondraldefectknee-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondraldefectknee-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-osteochondraldefectknee-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondraldefectknee-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-osteochondraldefectknee-stable-unstable

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondraldefectknee-stable-unstable

**Rationale:**
- Rule: l1_management_fact

## dp|dp-osteochondraldefectknee-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-osteochondraldefectknee-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-osteochondraldefectknee-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-osteochondraldefectknee-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

