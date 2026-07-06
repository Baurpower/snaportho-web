# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:52:25.090Z

**Items requiring human judgment:** 15
**Auto-curated (low-risk):** 83

Everything else was classified and justified by the first-pass curator.

## rel|anterior-shoulder-instability|tested_by|anterior-shoulder-instability-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** anterior-shoulder-instability -[tested_by]-> anterior-shoulder-instability-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|anterior-shoulder-instability|tested_by|anterior-shoulder-instability-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|anterior-shoulder-instability-mri-finding|indicates_treatment|anterior-shoulder-instability-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** anterior-shoulder-instability-mri-finding -[indicates_treatment]-> anterior-shoulder-instability-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: anterior-shoulder-instability-mri-finding -[indicates_treatment]-> anterior-shoulder-instability-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|anterior-shoulder-instability|treated_by|anterior-shoulder-instability-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** anterior-shoulder-instability -[treated_by]-> anterior-shoulder-instability-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|anterior-shoulder-instability|treated_by|anterior-shoulder-instability-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|anterior-shoulder-instability|treated_by|anterior-shoulder-instability-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** anterior-shoulder-instability -[treated_by]-> anterior-shoulder-instability-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|anterior-shoulder-instability|treated_by|anterior-shoulder-instability-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|anterior-shoulder-instability|differential_for|rotator-cuff-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** anterior-shoulder-instability -[differential_for]-> rotator-cuff-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|anterior-shoulder-instability|differential_for|rotator-cuff-tear

**Rationale:**
- Rule: default_human_review

## rel|anterior-shoulder-instability|differential_for|slap-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** anterior-shoulder-instability -[differential_for]-> slap-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|anterior-shoulder-instability|differential_for|slap-tear

**Rationale:**
- Rule: default_human_review

## rel|anterior-shoulder-instability|differential_for|proximal-humerus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** anterior-shoulder-instability -[differential_for]-> proximal-humerus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|anterior-shoulder-instability|differential_for|proximal-humerus-fracture

**Rationale:**
- Rule: default_human_review

## rel|anterior-shoulder-instability|at_risk_structure|axillary-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** anterior-shoulder-instability -[at_risk_structure]-> axillary-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|anterior-shoulder-instability|at_risk_structure|axillary-nerve

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-anteriorshoulderinstability-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-anteriorshoulderinstability-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-anteriorshoulderinstability-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-anteriorshoulderinstability-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-anteriorshoulderinstability-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-anteriorshoulderinstability-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-anteriorshoulderinstability-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-anteriorshoulderinstability-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-anteriorshoulderinstability-recurrence

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-anteriorshoulderinstability-recurrence

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-anteriorshoulderinstability-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-anteriorshoulderinstability-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-anteriorshoulderinstability-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-anteriorshoulderinstability-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

