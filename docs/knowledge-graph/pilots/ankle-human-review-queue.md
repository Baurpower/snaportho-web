# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T20:02:50.431Z

**Items requiring human judgment:** 15
**Auto-curated (low-risk):** 42

Everything else was classified and justified by the first-pass curator.

## rel|ankle-fracture|at_risk_structure|superficial-peroneal-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ankle-fracture -[at_risk_structure]-> superficial-peroneal-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ankle-fracture|at_risk_structure|superficial-peroneal-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|deltoid-ligament|explains_instability|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** deltoid-ligament -[explains_instability]-> ankle-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|deltoid-ligament|explains_instability|ankle-fracture

**Rationale:**
- Rule: high_risk_predicate

## rel|syndesmosis|explains_instability|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** syndesmosis -[explains_instability]-> ankle-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|syndesmosis|explains_instability|ankle-fracture

**Rationale:**
- Rule: high_risk_predicate

## rel|medial-clear-space-widening|explains_instability|ankle-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** medial-clear-space-widening -[explains_instability]-> ankle-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|medial-clear-space-widening|explains_instability|ankle-fracture

**Rationale:**
- Rule: high_risk_predicate

## rel|ankle-fracture|uses_fixation|ankle-orif-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ankle-fracture -[uses_fixation]-> ankle-orif-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ankle-fracture|uses_fixation|ankle-orif-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|ankle-fracture|treated_by|ankle-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ankle-fracture -[treated_by]-> ankle-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ankle-fracture|treated_by|ankle-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|medial-clear-space-widening|indicates_treatment|ankle-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** medial-clear-space-widening -[indicates_treatment]-> ankle-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: medial-clear-space-widening -[indicates_treatment]-> ankle-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|ankle-orif|at_risk_structure|superficial-peroneal-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** ankle-orif -[at_risk_structure]-> superficial-peroneal-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|ankle-orif|at_risk_structure|superficial-peroneal-nerve

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-ankle-mortise-congruity

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ankle-mortise-congruity

**Rationale:**
- Rule: l1_management_fact

## claim|claim-ankle-deltoid-unstable-fibula

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ankle-deltoid-unstable-fibula

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-ankle-medial-clear-space

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ankle-medial-clear-space

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-ankle-isolated-fibula-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ankle-isolated-fibula-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-ankle-syndesmosis-language

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ankle-syndesmosis-language

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-ankle-unstable-mortise-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-ankle-unstable-mortise-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-ankle-stable-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-ankle-stable-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

