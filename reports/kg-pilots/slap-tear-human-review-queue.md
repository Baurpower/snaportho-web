# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:01:04.107Z

**Items requiring human judgment:** 15
**Auto-curated (low-risk):** 84

Everything else was classified and justified by the first-pass curator.

## rel|slap-tear|tested_by|slap-tear-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** slap-tear -[tested_by]-> slap-tear-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|slap-tear|tested_by|slap-tear-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|slap-tear-mri-finding|indicates_treatment|slap-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** slap-tear-mri-finding -[indicates_treatment]-> slap-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: slap-tear-mri-finding -[indicates_treatment]-> slap-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|slap-tear|treated_by|slap-tear-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** slap-tear -[treated_by]-> slap-tear-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|slap-tear|treated_by|slap-tear-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|slap-tear|treated_by|slap-tear-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** slap-tear -[treated_by]-> slap-tear-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|slap-tear|treated_by|slap-tear-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|slap-tear|differential_for|anterior-shoulder-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** slap-tear -[differential_for]-> anterior-shoulder-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|slap-tear|differential_for|anterior-shoulder-instability

**Rationale:**
- Rule: default_human_review

## rel|slap-tear|differential_for|proximal-biceps-tendon-pathology

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** slap-tear -[differential_for]-> proximal-biceps-tendon-pathology
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|slap-tear|differential_for|proximal-biceps-tendon-pathology

**Rationale:**
- Rule: default_human_review

## rel|slap-tear|differential_for|rotator-cuff-tear

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** slap-tear -[differential_for]-> rotator-cuff-tear
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|slap-tear|differential_for|rotator-cuff-tear

**Rationale:**
- Rule: default_human_review

## rel|slap-tear|differential_for|proximal-humerus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** slap-tear -[differential_for]-> proximal-humerus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|slap-tear|differential_for|proximal-humerus-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-slaptear-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-slaptear-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-slaptear-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-slaptear-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-slaptear-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-slaptear-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-slaptear-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-slaptear-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-slaptear-obriens

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-slaptear-obriens

**Rationale:**
- Rule: l1_management_fact

## dp|dp-slaptear-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-slaptear-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-slaptear-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-slaptear-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

