# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:14:27.772Z

**Items requiring human judgment:** 14
**Auto-curated (low-risk):** 81

Everything else was classified and justified by the first-pass curator.

## rel|chronic-lateral-ankle-instability|tested_by|chronic-lateral-ankle-instability-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** chronic-lateral-ankle-instability -[tested_by]-> chronic-lateral-ankle-instability-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|chronic-lateral-ankle-instability|tested_by|chronic-lateral-ankle-instability-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|chronic-lateral-ankle-instability-mri-finding|indicates_treatment|chronic-lateral-ankle-instability-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** chronic-lateral-ankle-instability-mri-finding -[indicates_treatment]-> chronic-lateral-ankle-instability-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: chronic-lateral-ankle-instability-mri-finding -[indicates_treatment]-> chronic-lateral-ankle-instability-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|chronic-lateral-ankle-instability|treated_by|chronic-lateral-ankle-instability-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** chronic-lateral-ankle-instability -[treated_by]-> chronic-lateral-ankle-instability-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|chronic-lateral-ankle-instability|treated_by|chronic-lateral-ankle-instability-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|chronic-lateral-ankle-instability|treated_by|chronic-lateral-ankle-instability-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** chronic-lateral-ankle-instability -[treated_by]-> chronic-lateral-ankle-instability-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|chronic-lateral-ankle-instability|treated_by|chronic-lateral-ankle-instability-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|chronic-lateral-ankle-instability|differential_for|syndesmotic-sprain

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** chronic-lateral-ankle-instability -[differential_for]-> syndesmotic-sprain
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|chronic-lateral-ankle-instability|differential_for|syndesmotic-sprain

**Rationale:**
- Rule: default_human_review

## rel|chronic-lateral-ankle-instability|differential_for|achilles-tendon-rupture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** chronic-lateral-ankle-instability -[differential_for]-> achilles-tendon-rupture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|chronic-lateral-ankle-instability|differential_for|achilles-tendon-rupture

**Rationale:**
- Rule: default_human_review

## rel|chronic-lateral-ankle-instability|differential_for|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** chronic-lateral-ankle-instability -[differential_for]-> ankle-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|chronic-lateral-ankle-instability|differential_for|ankle-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-chroniclateralankleinstability-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-chroniclateralankleinstability-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-chroniclateralankleinstability-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-chroniclateralankleinstability-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-chroniclateralankleinstability-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-chroniclateralankleinstability-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-chroniclateralankleinstability-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-chroniclateralankleinstability-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-chroniclateralankleinstability-brostrom

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-chroniclateralankleinstability-brostrom

**Rationale:**
- Rule: l1_management_fact

## dp|dp-chroniclateralankleinstability-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-chroniclateralankleinstability-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-chroniclateralankleinstability-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-chroniclateralankleinstability-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

