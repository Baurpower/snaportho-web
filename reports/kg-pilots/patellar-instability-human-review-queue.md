# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:45:19.695Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 83

Everything else was classified and justified by the first-pass curator.

## rel|patellar-instability|tested_by|patellar-instability-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** patellar-instability -[tested_by]-> patellar-instability-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|patellar-instability|tested_by|patellar-instability-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|patellar-instability-mri-finding|indicates_treatment|patellar-instability-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** patellar-instability-mri-finding -[indicates_treatment]-> patellar-instability-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: patellar-instability-mri-finding -[indicates_treatment]-> patellar-instability-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|patellar-instability|treated_by|patellar-instability-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** patellar-instability -[treated_by]-> patellar-instability-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|patellar-instability|treated_by|patellar-instability-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|patellar-instability|treated_by|patellar-instability-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** patellar-instability -[treated_by]-> patellar-instability-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|patellar-instability|treated_by|patellar-instability-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|patellar-instability|differential_for|acl-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** patellar-instability -[differential_for]-> acl-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|patellar-instability|differential_for|acl-tear

**Rationale:**
- Rule: default_human_review

## rel|patellar-instability|differential_for|osteochondral-defect-knee

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** patellar-instability -[differential_for]-> osteochondral-defect-knee
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|patellar-instability|differential_for|osteochondral-defect-knee

**Rationale:**
- Rule: default_human_review

## rel|patellar-instability|differential_for|patella-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** patellar-instability -[differential_for]-> patella-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|patellar-instability|differential_for|patella-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-patellarinstability-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-patellarinstability-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-patellarinstability-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-patellarinstability-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-patellarinstability-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-patellarinstability-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-patellarinstability-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-patellarinstability-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-patellarinstability-j-sign

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-patellarinstability-j-sign

**Rationale:**
- Rule: l1_management_fact

## dp|dp-patellarinstability-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-patellarinstability-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-patellarinstability-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-patellarinstability-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

