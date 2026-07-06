# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:34:01.344Z

**Items requiring human judgment:** 10
**Auto-curated (low-risk):** 38

Everything else was classified and justified by the first-pass curator.

## rel|subtrochanteric-fracture|treated_by|cephalomedullary-nail

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** subtrochanteric-fracture -[treated_by]-> cephalomedullary-nail
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|subtrochanteric-fracture|treated_by|cephalomedullary-nail

**Rationale:**
- Rule: high_risk_predicate

## rel|subtrochanteric-fracture|treated_by|subtrochanteric-plate-osteosynthesis

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** subtrochanteric-fracture -[treated_by]-> subtrochanteric-plate-osteosynthesis
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|subtrochanteric-fracture|treated_by|subtrochanteric-plate-osteosynthesis

**Rationale:**
- Rule: high_risk_predicate

## rel|subtrochanteric-plate-osteosynthesis|at_risk_structure|sciatic-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** subtrochanteric-plate-osteosynthesis -[at_risk_structure]-> sciatic-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|subtrochanteric-plate-osteosynthesis|at_risk_structure|sciatic-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|atypical-subtrochanteric-fracture|explains_instability|subtrochanteric-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** atypical-subtrochanteric-fracture -[explains_instability]-> subtrochanteric-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|atypical-subtrochanteric-fracture|explains_instability|subtrochanteric-fracture

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-st-high-mechanical-demand

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-st-high-mechanical-demand

**Rationale:**
- Rule: l1_management_fact

## claim|claim-st-cephalomedullary-default

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-st-cephalomedullary-default

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-st-atypical-bisphosphonate

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-st-atypical-bisphosphonate

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-st-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-st-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-st-cephalomedullary-nail

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-st-cephalomedullary-nail

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-st-atypical-workup

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-st-atypical-workup

**Rationale:**
- Rule: decision_point_requires_attending

