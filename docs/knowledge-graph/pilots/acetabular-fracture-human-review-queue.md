# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:31:52.932Z

**Items requiring human judgment:** 9
**Auto-curated (low-risk):** 84

Everything else was classified and justified by the first-pass curator.

## rel|posterior-wall-acetabular-fracture|indicates_treatment|acetabular-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** posterior-wall-acetabular-fracture -[indicates_treatment]-> acetabular-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: posterior-wall-acetabular-fracture -[indicates_treatment]-> acetabular-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|acetabular-fracture|treated_by|acetabular-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** acetabular-fracture -[treated_by]-> acetabular-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|acetabular-fracture|treated_by|acetabular-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|posterior-wall-acetabular-fracture|explains_instability|acetabular-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** posterior-wall-acetabular-fracture -[explains_instability]-> acetabular-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|posterior-wall-acetabular-fracture|explains_instability|acetabular-fracture

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-acet-column-wall

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acet-column-wall

**Rationale:**
- Rule: l1_management_fact

## claim|claim-acet-posterior-wall-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acet-posterior-wall-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acet-nonoperative-displaced

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acet-nonoperative-displaced

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-acet-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-acet-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-acet-posterior-wall-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-acet-posterior-wall-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-acet-displaced-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-acet-displaced-orif

**Rationale:**
- Rule: decision_point_requires_attending

