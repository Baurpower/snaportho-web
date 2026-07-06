# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T23:20:58.412Z

**Items requiring human judgment:** 15
**Auto-curated (low-risk):** 81

Everything else was classified and justified by the first-pass curator.

## rel|osteochondral-lesion-talus|tested_by|osteochondral-lesion-talus-exam-maneuver

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-lesion-talus -[tested_by]-> osteochondral-lesion-talus-exam-maneuver
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-lesion-talus|tested_by|osteochondral-lesion-talus-exam-maneuver

**Rationale:**
- Rule: default_human_review

## rel|osteochondral-lesion-talus-mri-finding|indicates_treatment|osteochondral-lesion-talus-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** osteochondral-lesion-talus-mri-finding -[indicates_treatment]-> osteochondral-lesion-talus-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: osteochondral-lesion-talus-mri-finding -[indicates_treatment]-> osteochondral-lesion-talus-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|osteochondral-lesion-talus|treated_by|osteochondral-lesion-talus-reconstruction

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** osteochondral-lesion-talus -[treated_by]-> osteochondral-lesion-talus-reconstruction
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-lesion-talus|treated_by|osteochondral-lesion-talus-reconstruction

**Rationale:**
- Rule: high_risk_predicate

## rel|osteochondral-lesion-talus|treated_by|osteochondral-lesion-talus-rehab-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** osteochondral-lesion-talus -[treated_by]-> osteochondral-lesion-talus-rehab-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-lesion-talus|treated_by|osteochondral-lesion-talus-rehab-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|osteochondral-lesion-talus|differential_for|chronic-lateral-ankle-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-lesion-talus -[differential_for]-> chronic-lateral-ankle-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-lesion-talus|differential_for|chronic-lateral-ankle-instability

**Rationale:**
- Rule: default_human_review

## rel|osteochondral-lesion-talus|differential_for|syndesmotic-sprain

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-lesion-talus -[differential_for]-> syndesmotic-sprain
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-lesion-talus|differential_for|syndesmotic-sprain

**Rationale:**
- Rule: default_human_review

## rel|osteochondral-lesion-talus|differential_for|talus-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-lesion-talus -[differential_for]-> talus-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-lesion-talus|differential_for|talus-fracture

**Rationale:**
- Rule: default_human_review

## rel|osteochondral-lesion-talus|differential_for|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** osteochondral-lesion-talus -[differential_for]-> ankle-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|osteochondral-lesion-talus|differential_for|ankle-fracture

**Rationale:**
- Rule: default_human_review

## claim|claim-osteochondrallesiontalus-oneliner

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondrallesiontalus-oneliner

**Rationale:**
- Rule: l1_management_fact

## claim|claim-osteochondrallesiontalus-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondrallesiontalus-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-osteochondrallesiontalus-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondrallesiontalus-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-osteochondrallesiontalus-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondrallesiontalus-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-osteochondrallesiontalus-berndt-harty

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-osteochondrallesiontalus-berndt-harty

**Rationale:**
- Rule: l1_management_fact

## dp|dp-osteochondrallesiontalus-operative-indication

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-osteochondrallesiontalus-operative-indication

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-osteochondrallesiontalus-return-to-play

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-osteochondrallesiontalus-return-to-play

**Rationale:**
- Rule: decision_point_requires_attending

