# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:38:12.668Z

**Items requiring human judgment:** 9
**Auto-curated (low-risk):** 60

Everything else was classified and justified by the first-pass curator.

## rel|distal-femur-fracture|at_risk_structure|popliteal-artery

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-femur-fracture -[at_risk_structure]-> popliteal-artery
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-femur-fracture|at_risk_structure|popliteal-artery

**Rationale:**
- Rule: high_risk_predicate

## rel|intra-articular-distal-femur-fracture|indicates_treatment|distal-femur-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** intra-articular-distal-femur-fracture -[indicates_treatment]-> distal-femur-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: intra-articular-distal-femur-fracture -[indicates_treatment]-> distal-femur-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-femur-fracture|treated_by|distal-femur-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-femur-fracture -[treated_by]-> distal-femur-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-femur-fracture|treated_by|distal-femur-orif

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-dff-articular-reduction

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dff-articular-reduction

**Rationale:**
- Rule: l1_management_fact

## claim|claim-dff-popliteal-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dff-popliteal-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-dff-nonoperative-displaced

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dff-nonoperative-displaced

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-dff-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dff-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-dff-intra-articular-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-dff-intra-articular-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-dff-vascular-workup

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-dff-vascular-workup

**Rationale:**
- Rule: decision_point_requires_attending

