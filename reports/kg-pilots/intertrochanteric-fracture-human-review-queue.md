# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:33:19.216Z

**Items requiring human judgment:** 11
**Auto-curated (low-risk):** 39

Everything else was classified and justified by the first-pass curator.

## rel|unstable-intertrochanteric-pattern|indicates_treatment|cephalomedullary-nailing

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** unstable-intertrochanteric-pattern -[indicates_treatment]-> cephalomedullary-nailing
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: unstable-intertrochanteric-pattern -[indicates_treatment]-> cephalomedullary-nailing

**Rationale:**
- Rule: high_risk_predicate

## rel|reverse-obliquity-it-fracture|indicates_treatment|cephalomedullary-nailing

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** reverse-obliquity-it-fracture -[indicates_treatment]-> cephalomedullary-nailing
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: reverse-obliquity-it-fracture -[indicates_treatment]-> cephalomedullary-nailing

**Rationale:**
- Rule: high_risk_predicate

## rel|intertrochanteric-fracture|treated_by|cephalomedullary-nail

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** intertrochanteric-fracture -[treated_by]-> cephalomedullary-nail
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|intertrochanteric-fracture|treated_by|cephalomedullary-nail

**Rationale:**
- Rule: high_risk_predicate

## rel|intertrochanteric-fracture|treated_by|sliding-hip-screw

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** intertrochanteric-fracture -[treated_by]-> sliding-hip-screw
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|intertrochanteric-fracture|treated_by|sliding-hip-screw

**Rationale:**
- Rule: high_risk_predicate

## rel|unstable-intertrochanteric-pattern|explains_instability|intertrochanteric-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** unstable-intertrochanteric-pattern -[explains_instability]-> intertrochanteric-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|unstable-intertrochanteric-pattern|explains_instability|intertrochanteric-fracture

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-it-extracapsular-fixation

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-it-extracapsular-fixation

**Rationale:**
- Rule: l1_management_fact

## claim|claim-it-reverse-obliquity-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-it-reverse-obliquity-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-it-cutout-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-it-cutout-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-it-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-it-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-it-cephalomedullary-unstable

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-it-cephalomedullary-unstable

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-it-shs-stable

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-it-shs-stable

**Rationale:**
- Rule: decision_point_requires_attending

